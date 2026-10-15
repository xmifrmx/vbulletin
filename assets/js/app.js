import {esc,fmtDate,plain,excerpt} from './core/util.js';
import {setLang,t} from './core/i18n.js';
import {layout,crumbs} from './core/layout.js';
import {icon} from './core/icons.js';
import {applyAction} from './core/actions.js';
import {validateDb,catChain,catPath,childrenOf,descendantIds,topicStats,publicView} from './core/schema.js';
import {toFiles,fromFiles} from './core/files.js';
import {forumBlock,topicRows,postHtml,paginationHtml,homeBody,topicPages,pageCount,time} from './core/views.js';
import * as store from './store.js';
import {createEditor} from './editor.js';
import {dialog,confirmDlg,toast,rt} from './ui.js';

const $=(s,r=document)=>r.querySelector(s);
let db,S,stats,pub,pstats,mode='local',repoSettings={};
const base=new URL('../data/',location.href).href;
const K={home:'#/',newTopic:'#/yeni-konu',search:'#/ara',bookmarks:'#/yer-imleri',admin:'#/yonetim',about:'#/hakkinda',searchAction:'#/ara',sitemap:'../sitemap.xml',interactive:'#/'};
const L={cat:c=>'#/kategori/'+catPath(db,c.id),topic:(tp,p=1,a)=>`#/konu/${tp.slug}/${tp.id}${p>1?'/sayfa/'+p:''}${a?'?go='+a:''}`};
const go=h=>location.hash===h?route():(location.hash=h);
function recompute(){S=db.settings;stats=topicStats(db);pub=publicView(db);pstats=topicStats(pub);setLang(S.lang||'tr');rt.ctx={parent:location.hostname,peertubeHosts:S.peertubeHosts||[]}}
const catOptions=(sel,skip=new Set(),onlyActive=true)=>{const o=[];const w=(pid,d)=>childrenOf(db,pid).forEach(c=>{if(skip.has(c.id))return;if(!onlyActive||catChain(db,c.id).every(x=>x.active!==false))o.push(`<option value="${c.id}"${c.id===sel?' selected':''}>${'— '.repeat(d)}${esc(c.name)}</option>`);w(c.id,d+1)});w(null,0);return o.join('')};
const ferr=(f,m)=>{const p=$('.form-err',f);p.textContent=m;p.hidden=false;p.scrollIntoView({block:'nearest'})};
const idFields=()=>`<div class="frow"><label>Kullanıcı adı<input name="author" required minlength="2" maxlength="30" autocomplete="nickname" value="${esc(store.getAuthor())}"></label><label>E-posta (isteğe bağlı; herkese açık gösterilmez)<input name="email" type="email" maxlength="254" autocomplete="email"></label></div>`;
function readId(f){const author=f.author.value.trim(),email=f.email.value.trim();
  if(author.length<2)return {err:'Kullanıcı adı en az 2 karakter olmalı.'};if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))return {err:'E-posta biçimi geçersiz.'};return {author,email}}
async function run(action,payload){
  if(mode==='shared')return store.submitIssue(repoSettings.shared,action,payload);
  const r=applyAction(db,action,payload,{admin:true});if(!r.ok)return r;
  try{store.saveLocal(db)}catch(e){return {ok:false,error:e.message}}recompute();return r}
async function op(action,payload,msg){const r=await run(action,payload);if(!r.ok)toast(r.error,'err');else if(r.shared)toast('GitHub sayfası açıldı; gönderimi orada onaylayın.','ok');else{toast(msg||'Kaydedildi','ok');route()}return r}
const notice=()=>mode==='local'
  ?`<div class="notice info" role="note">${icon('info')} <b>Yerel mod:</b> içerikler yalnızca bu tarayıcıda saklanır; diğer ziyaretçiler görmez. <a href="#/hakkinda">Ayrıntı ve mod seçimi</a></div>`
  :`<div class="notice info" role="note">${icon('info')} <b>Ortak mod:</b> yazma işlemleri GitHub issue ile gönderilir; doğrulanır ve yayımlanır (birkaç dakika sürer). <a href="#/hakkinda">Ayrıntı</a></div>`;
function show(title,items,html){$('#crumbs').innerHTML=crumbs(items);$('#app').innerHTML=notice()+html;document.title=title===S.siteName?`${S.siteName}${S.tagline?" - "+S.tagline:""}`:`${title} - ${S.siteName}`;
  const g=new URLSearchParams(location.hash.split('?')[1]||'').get('go'),el=g&&document.getElementById(g);if(el){el.scrollIntoView();el.classList.add('hl')}else scrollTo(0,0);$('#main').focus({preventScroll:true})}
const H=[{name:'',href:'#/'}];const home=()=>({name:S.siteName,href:'#/'});
const catItems=c=>[home(),...catChain(db,c.id).map(x=>({name:x.name,href:L.cat(x)}))];
const nf=()=>show('Bulunamadı',[home(),{name:'404'}],`<h1 class="ptitle">404 — Sayfa bulunamadı</h1><p><a href="#/">Ana sayfaya dönün</a>.</p>`);
const sorted=(list,s)=>{const c={son:(a,b)=>stats.get(b.id).lastAt.localeCompare(stats.get(a.id).lastAt),tarih:(a,b)=>b.created.localeCompare(a.created),baslik:(a,b)=>a.title.localeCompare(b.title,'tr')}[s]||null;return list.sort((a,b)=>(b.pinned-a.pinned)||(c||(()=>0))(a,b))};
const clampPage=(n,max)=>Math.min(Math.max(parseInt(n)||1,1),max);

function homeView(){show(S.siteName,[{name:S.siteName}],`<h1 class="ptitle">${esc(S.siteName)}${S.tagline?`<small>${esc(S.tagline)}</small>`:''}</h1>`+homeBody(pub,pstats,L,rt.ctx))}
function categoryView(m,q){const c=pub.categories.find(x=>x.slug===m[1].split('/').at(-1)&&catPath(pub,x.id)===m[1]);if(!c)return nf();
  const sort=['son','tarih','baslik'].includes(q.get('sirala'))?q.get('sirala'):'son',per=S.topicsPerPage||20,all=sorted(pub.topics.filter(x=>x.categoryId===c.id),sort),pages=pageCount(all.length,per),pg=clampPage(q.get('sayfa'),pages);
  const hr=n=>`#/kategori/${m[1]}?sirala=${sort}&sayfa=${n}`,sl=(k,l)=>`<a class="btn sm" href="#/kategori/${m[1]}?sirala=${k}" ${sort===k?'aria-current="true"':''}>${l}</a>`;
  show(c.seoTitle||c.name,catItems(c),`<h1 class="ptitle">${esc(c.name)}</h1>${c.description?`<p>${esc(c.description)}</p>`:''}${childrenOf(pub,c.id).length?forumBlock(pub,pstats,L,c):''}<div class="bar"><a class="btn primary" href="#/yeni-konu/${c.id}">${icon('plus')} ${t('newTopic')}</a><span class="grow"></span><span class="small">Sırala:</span>${sl('son','Son cevap')}${sl('tarih','Tarih')}${sl('baslik','Başlık')}</div>${topicRows(pub,pstats,L,all.slice((pg-1)*per,pg*per))}${paginationHtml(pg,pages,hr)}`)}
function topicView(m){const tp=db.topics.find(x=>x.id===+m[2]);if(!tp)return nf();
  const reps=db.replies.filter(r=>r.topicId===tp.id).sort((a,b)=>a.id-b.id),per=S.repliesPerPage||10,pages=pageCount(reps.length,per),pg=clampPage(m[3],pages),chain=catChain(db,tp.categoryId);
  if(m[1]!==tp.slug)history.replaceState(null,'',L.topic(tp,pg));
  const bm=store.getBm().includes(tp.id),lastAnchor=reps.length?'post-'+reps.at(-1).id:'post-0';
  const acts=(k,id)=>`${tp.locked?'':`<button class="btn sm" data-act="quote" data-k="${k}" data-id="${id}">${icon('quote',13)} Alıntıla</button>`}<a class="btn sm" href="#/duzenle-${k==='t'?'konu':'cevap'}/${id}">${icon('pencil',13)} Düzenle</a><button class="btn sm danger" data-act="${k==='t'?'deleteTopic':'deleteReply'}" data-id="${id}">${icon('trash',13)} Sil</button>`;
  const ix=db.topics.filter(x=>x.categoryId===tp.categoryId).sort((a,b)=>a.id-b.id),i=ix.findIndex(x=>x.id===tp.id),pv=ix[i-1],nx=ix[i+1];
  const posts=(pg===1?postHtml({ctx:rt.ctx,id:0,author:tp.author,created:tp.created,updated:tp.updated,content:tp.content,no:1,owner:true,actions:acts('t',tp.id)}):'')+reps.slice((pg-1)*per,pg*per).map((r,k)=>postHtml({ctx:rt.ctx,id:r.id,author:r.author,created:r.created,updated:r.updated,content:r.content,no:(pg-1)*per+k+2,actions:acts('r',r.id)})).join('');
  const pager=paginationHtml(pg,pages,n=>L.topic(tp,n));
  show(tp.title,[...catItems({id:tp.categoryId}),{name:tp.title}],`<h1 class="ptitle">${tp.pinned?icon('pin')+' ':''}${tp.locked?icon('lock')+' ':''}${esc(tp.title)}</h1>
<div class="bar">${tp.locked?'':`<a class="btn primary" href="#/cevap/${tp.id}">${icon('reply')} ${t('reply')}</a>`}<button class="btn" data-act="copyLink" data-id="${tp.id}">${icon('copy')} Bağlantıyı kopyala</button><button class="btn" data-act="bookmark" data-id="${tp.id}" aria-pressed="${bm}">${icon('bookmark')} Yer imi</button><a class="btn" href="${L.topic(tp,pages,lastAnchor)}">${icon('last')} ${t('goLast')}</a></div>
<div class="bar"><button class="btn sm" data-act="pinTopic" data-id="${tp.id}">${icon('pin',13)} ${tp.pinned?'Sabitlemeyi kaldır':'Sabitle'}</button><button class="btn sm" data-act="lockTopic" data-id="${tp.id}">${icon('lock',13)} ${tp.locked?'Kilidi aç':'Kilitle'}</button><button class="btn sm" data-act="moveTopic" data-id="${tp.id}">${icon('move',13)} Taşı</button></div>
${tp.locked?`<p class="notice">${t('lockedNote')}</p>`:''}${pager}${posts}${pager}
${tp.locked?'':`<form class="form" id="qr" novalidate><h2>Hızlı Cevap</h2>${idFields()}<div id="qred"></div><p class="form-err" role="alert" hidden></p><div class="bar"><button class="btn primary" type="submit">${icon('reply')} Cevapla</button><a class="btn" href="#/cevap/${tp.id}">Gelişmiş editör</a></div></form>`}
<nav class="topicnav" aria-label="${t('topicNav')}">${pv?`<a href="${L.topic(pv)}">${t('prevTopic')}: ${esc(pv.title)}</a>`:'<span></span>'}${nx?`<a href="${L.topic(nx)}">${t('nextTopic')}: ${esc(nx.title)}</a>`:''}</nav>`);
  if(!tp.locked)replyForm($('#qr'),$('#qred'),tp,{compact:true,key:'q'+tp.id})}
function replyForm(f,mountEl,tp,{compact=false,key}){const ed=createEditor(mountEl,{key:key||'r'+tp.id,compact});window.__ed=ed;
  f.addEventListener('submit',async e=>{e.preventDefault();const id=readId(f);if(id.err)return ferr(f,id.err);
    const r=await run('newReply',{topicId:tp.id,author:id.author,content:ed.getHtml()});if(!r.ok)return ferr(f,r.error);if(r.shared)return toast('GitHub sayfası açıldı; gönderimi orada onaylayın.','ok');
    store.setPrivate('r'+r.id,id.email);store.setAuthor(id.author);ed.clearDraft();toast('Cevap eklendi','ok');go(L.topic(tp,topicPages(db,stats,tp),'post-'+r.id))})}
function replyPage(m){const tp=db.topics.find(x=>x.id===+m[1]);if(!tp)return nf();if(tp.locked)return show('Kilitli',[...catItems({id:tp.categoryId}),{name:tp.title,href:L.topic(tp)}],`<h1 class="ptitle">Konu kilitli</h1><p>${t('lockedNote')}</p>`);
  show('Cevap yaz',[...catItems({id:tp.categoryId}),{name:tp.title,href:L.topic(tp)},{name:t('reply')}],`<h1 class="ptitle">Cevap yaz: ${esc(tp.title)}</h1><form class="form" id="rf" novalidate>${idFields()}<div id="red"></div><p class="form-err" role="alert" hidden></p><button class="btn primary" type="submit">Cevabı gönder</button></form>`);
  replyForm($('#rf'),$('#red'),tp,{key:'r'+tp.id})}
function newTopicView(m){const pre=m[1]?+m[1]:null;
  show(t('newTopic'),[home(),{name:t('newTopic')}],`<h1 class="ptitle">${t('newTopic')}</h1><form class="form" id="nf" novalidate>${idFields()}<div class="frow"><label>Konu başlığı<input name="title" required minlength="3" maxlength="150"></label><label>Kategori<select name="cat" required>${catOptions(pre)}</select></label></div><div id="ned"></div><p class="form-err" role="alert" hidden></p><button class="btn primary" type="submit">${icon('plus')} Konuyu aç</button></form>`);
  const f=$('#nf'),ed=createEditor($('#ned'),{key:'newtopic'});
  f.addEventListener('submit',async e=>{e.preventDefault();const id=readId(f);if(id.err)return ferr(f,id.err);
    const r=await run('newTopic',{title:f.title.value,categoryId:f.cat.value,author:id.author,content:ed.getHtml()});if(!r.ok)return ferr(f,r.error);if(r.shared)return toast('GitHub sayfası açıldı; gönderimi orada onaylayın.','ok');
    store.setPrivate('t'+r.id,id.email);store.setAuthor(id.author);ed.clearDraft();toast('Konu açıldı','ok');go(L.topic(r.topic))})}
function editTopicView(m){const tp=db.topics.find(x=>x.id===+m[1]);if(!tp)return nf();
  show('Konuyu düzenle',[...catItems({id:tp.categoryId}),{name:tp.title,href:L.topic(tp)},{name:'Düzenle'}],`<h1 class="ptitle">Konuyu düzenle</h1><form class="form" id="ef" novalidate><label>Başlık<input name="title" required maxlength="150" value="${esc(tp.title)}"></label><div id="eed"></div><p class="form-err" role="alert" hidden></p><button class="btn primary">Kaydet</button></form>`);
  const f=$('#ef'),ed=createEditor($('#eed'),{key:'',initial:tp.content});
  f.addEventListener('submit',async e=>{e.preventDefault();const r=await run('editTopic',{id:tp.id,title:f.title.value,content:ed.getHtml(),expectUpdated:tp.updated});if(!r.ok)return ferr(f,r.error);if(r.shared)return toast('GitHub sayfası açıldı.','ok');toast('Kaydedildi','ok');go(L.topic(db.topics.find(x=>x.id===tp.id)))})}
function editReplyView(m){const r0=db.replies.find(x=>x.id===+m[1]);if(!r0)return nf();const tp=db.topics.find(x=>x.id===r0.topicId);
  show('Cevabı düzenle',[...catItems({id:tp.categoryId}),{name:tp.title,href:L.topic(tp)},{name:'Cevabı düzenle'}],`<h1 class="ptitle">Cevabı düzenle</h1><form class="form" id="ef" novalidate><div id="eed"></div><p class="form-err" role="alert" hidden></p><button class="btn primary">Kaydet</button></form>`);
  const f=$('#ef'),ed=createEditor($('#eed'),{initial:r0.content});
  f.addEventListener('submit',async e=>{e.preventDefault();const r=await run('editReply',{id:r0.id,content:ed.getHtml(),expectUpdated:r0.updated});if(!r.ok)return ferr(f,r.error);if(r.shared)return toast('GitHub sayfası açıldı.','ok');toast('Kaydedildi','ok');go(L.topic(tp,replyPageOf(r0),'post-'+r0.id))})}
const replyPageOf=r=>Math.floor(db.replies.filter(x=>x.topicId===r.topicId&&x.id<r.id).length/(S.repliesPerPage||10))+1;
function searchView(m,q){const term=(q.get('q')||'').trim(),sort=q.get('sirala')==='tarih'?'tarih':'ilgi',per=20;
  const low=s=>plain(s).toLocaleLowerCase('tr'),terms=low(term).split(/\s+/).filter(Boolean);let hits=[];
  if(terms.length){for(const tp of pub.topics){const ti=tp.title.toLocaleLowerCase('tr'),all=[ti,low(tp.content)];const tr=pub.replies.filter(r=>r.topicId===tp.id);
    const inTopic=terms.every(x=>all.join(' ').includes(x));if(inTopic)hits.push({tp,score:terms.every(x=>ti.includes(x))?2:1,date:tp.created,ex:tp.content});
    for(const r of tr)if(terms.every(x=>low(r.content).includes(x)))hits.push({tp,score:0,date:r.created,ex:r.content,r})}
    hits.sort((a,b)=>sort==='tarih'?b.date.localeCompare(a.date):(b.score-a.score)||b.date.localeCompare(a.date))}
  const pages=pageCount(hits.length,per),pg=clampPage(q.get('sayfa'),pages),hr=n=>`#/ara?q=${encodeURIComponent(term)}&sirala=${sort}&sayfa=${n}`;
  show('Ara',[home(),{name:t('search')}],`<h1 class="ptitle">${t('search')}</h1><form class="form" id="sf" role="search"><div class="frow"><label>Aranacak sözcükler<input name="q" value="${esc(term)}" maxlength="100"></label></div><button class="btn primary">${icon('search')} Ara</button></form>${term?`<p>${hits.length} sonuç. <a href="${hr(1).replace('sirala='+sort,'sirala='+(sort==='ilgi'?'tarih':'ilgi'))}">${sort==='ilgi'?'Tarihe göre sırala':'İlgiye göre sırala'}</a></p>`:''}<ul class="rlist">${hits.slice((pg-1)*per,pg*per).map(h=>`<li><a href="${h.r?L.topic(h.tp,replyPageOf(h.r),'post-'+h.r.id):L.topic(h.tp)}">${esc(h.tp.title)}</a>${h.r?' (cevap)':''} — <b>${esc(h.r?h.r.author:h.tp.author)}</b>, ${time(h.date)}<div class="small">${esc(excerpt(h.ex,140))}</div></li>`).join('')}</ul>${paginationHtml(pg,pages,hr)}`);
  $('#sf').addEventListener('submit',e=>{e.preventDefault();go('#/ara?q='+encodeURIComponent(e.target.q.value))})}
function bookmarksView(){const ids=store.getBm(),list=ids.map(id=>db.topics.find(x=>x.id===id)).filter(Boolean);
  show(t('bookmarks'),[home(),{name:t('bookmarks')}],`<h1 class="ptitle">${t('bookmarks')}</h1><p class="small">Yer imleri yalnızca bu tarayıcıda saklanır.</p>${list.length?topicRows(db,stats,L,list):'<p class="notice">Henüz yer imi yok. Bir konuda “Yer imi” düğmesini kullanın.</p>'}`)}
function aboutView(){const sh=repoSettings.shared?.enabled;
  show(t('about'),[home(),{name:t('about')}],`<h1 class="ptitle">Hakkında ve çalışma modu</h1>
<p>${esc(S.siteName)}, GitHub Pages üzerinde çalışan statik bir forum motorudur. Sunucu tarafı kod yoktur; bu yüzden iki mod vardır:</p>
<div class="form"><h2>Yerel mod ${mode==='local'?'(etkin)':''}</h2><p>Konu ve cevaplar yalnızca <b>bu tarayıcıda</b> saklanır (localStorage). Diğer ziyaretçiler göremez. JSON yedeğiyle taşınabilir. E-posta adresi yalnızca bu tarayıcıda kalır, hiçbir çıktıya girmez.</p>${mode==='local'?'':'<button class="btn" data-act="setMode" data-m="local">Yerel moda geç</button>'}</div>
<div class="form"><h2>Ortak mod ${mode==='shared'?'(etkin)':''}</h2>${sh?`<p>Yazma işlemleri <code>${esc(repoSettings.shared.repo)}</code> deposunda önceden doldurulmuş bir GitHub issue olarak açılır. GitHub Actions doğrular, hız sınırı ve spam kurallarını uygular, veriyi kaydeder ve siteyi yeniden yayımlar. <b>Gönderim için GitHub hesabı gerekir</b>; yönetici işlemleri yalnızca depo sahibi/ortaklarından kabul edilir. Kullanıcı adı doğrulanmaz, e-posta gönderilmez.</p>${mode==='shared'?'':'<button class="btn" data-act="setMode" data-m="shared">Ortak moda geç</button>'}`:'<p class="notice">Ortak yayın bu sitede <b>devre dışı</b>. Etkinleştirmek için README’deki adımları izleyin (settings.txt → shared).</p>'}</div>
<p class="small">Veri: ${db.categories.length} kategori, ${db.topics.length} konu, ${db.replies.length} cevap.</p>`)}
// ---- Yönetim ----
const flat=()=>{const o=[];const w=(p,d)=>childrenOf(db,p).forEach(c=>{o.push([c,d]);w(c.id,d+1)});w(null,0);return o};
function adminView(){const cats=flat(),tops=[...db.topics].sort((a,b)=>b.id-a.id).slice(0,50);
  show(t('admin'),[home(),{name:t('admin')}],`<h1 class="ptitle">${t('admin')}</h1>
<div class="notice err" role="note">${icon('alert')} <b>Bu panel yetkilendirme sağlamaz.</b> ${mode==='local'?'Yerel modda yalnızca bu tarayıcıdaki verileri değiştirir.':'Ortak modda her işlem GitHub issue olarak gönderilir; yetkiyi GitHub Actions sunucu tarafında (depo sahibi/ortak) denetler.'}</div>
<form class="form" id="setf" novalidate><h2>Site ayarları</h2><div class="frow"><label>Site adı<input name="siteName" required value="${esc(S.siteName)}"></label><label>Slogan<input name="tagline" value="${esc(S.tagline||'')}"></label></div><div class="frow"><label>Logo adresi (https)<input name="logoUrl" type="url" value="${esc(S.logoUrl||'')}"></label><label>Site adresi (canonical için)<input name="siteUrl" type="url" value="${esc(S.siteUrl||'')}"></label></div><div class="frow"><label>SEO başlığı (ana sayfa)<input name="seoTitle" value="${esc(S.seoTitle||'')}"></label><label>Meta açıklama (ana sayfa)<input name="seoDescription" value="${esc(S.seoDescription||'')}"></label></div><p class="form-err" role="alert" hidden></p><button class="btn primary">Ayarları kaydet</button></form>
<h2 class="sh">Kategoriler</h2><div class="bar"><button class="btn primary" data-act="catEdit" data-id="0">${icon('plus')} Yeni kategori</button></div>
<table class="tb adm"><thead><tr class="thead"><th>Ad</th><th>Slug</th><th class="num">Sıra</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>${cats.map(([c,d])=>`<tr><td class="alt1" data-label="Ad">${'— '.repeat(d)}${esc(c.name)}</td><td class="alt2" data-label="Slug">${esc(c.slug)}</td><td class="alt1 num" data-label="Sıra">${c.order||0}</td><td class="alt2" data-label="Durum">${c.active===false?'Pasif':'Aktif'}</td><td class="alt1"><button class="btn sm" data-act="catEdit" data-id="${c.id}">${icon('pencil',13)} Düzenle</button><button class="btn sm danger" data-act="catDel" data-id="${c.id}">${icon('trash',13)} Sil</button></td></tr>`).join('')}</tbody></table>
<h2 class="sh">Konular (son 50)</h2><table class="tb adm"><thead><tr class="thead"><th>Konu</th><th>Kategori</th><th>İşlem</th></tr></thead><tbody>${tops.map(tp=>`<tr><td class="alt1" data-label="Konu"><a href="${L.topic(tp)}">${esc(tp.title)}</a> <span class="small">#${tp.id}</span></td><td class="alt2" data-label="Kategori">${esc(catChain(db,tp.categoryId).map(c=>c.name).join(' / '))}</td><td class="alt1"><a class="btn sm" href="#/duzenle-konu/${tp.id}">${icon('pencil',13)} Düzenle</a><button class="btn sm" data-act="pinTopic" data-id="${tp.id}">${icon('pin',13)} ${tp.pinned?'Sabit kaldır':'Sabitle'}</button><button class="btn sm" data-act="lockTopic" data-id="${tp.id}">${icon('lock',13)} ${tp.locked?'Kilit aç':'Kilitle'}</button><button class="btn sm" data-act="moveTopic" data-id="${tp.id}">${icon('move',13)} Taşı</button><button class="btn sm danger" data-act="deleteTopic" data-id="${tp.id}">${icon('trash',13)} Sil</button></td></tr>`).join('')}</tbody></table>
<h2 class="sh">Veri, yedek ve doğrulama</h2><div class="bar"><button class="btn" data-act="export">${icon('download')} JSON yedek al</button><button class="btn" data-act="exportFiles">${icon('download')} Veri klasörü paketi</button><label class="btn" for="imp">${icon('upload')} Yedeği geri yükle</label><input id="imp" class="sr" type="file" accept="application/json,.json"><button class="btn" data-act="validate">${icon('check')} Veri doğrulama raporu</button>${mode==='local'?`<button class="btn danger" data-act="sync">Depo verisiyle eşitle (yerel değişiklikleri sil)</button>`:''}</div><div id="vrep" aria-live="polite"></div>
<p class="small">“Veri klasörü paketi”, yerel içeriği depoya taşımak için <code>node tools/unpack.mjs paket.json</code> ile kullanılır. Yedeklere e-posta adresleri dahil edilmez.</p>`);
  $('#setf').addEventListener('submit',async e=>{e.preventDefault();const f=e.target,r=await run('saveSettings',Object.fromEntries(new FormData(f)));if(!r.ok)return ferr(f,r.error);if(r.shared)return toast('GitHub sayfası açıldı.','ok');toast('Ayarlar kaydedildi','ok');location.reload()});
  $('#imp').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const o=JSON.parse(await file.text());if(o.format!=='mifrm-backup'||!o.db)throw new Error('Bu bir MiFRM yedeği değil.');
    const r=validateDb(o.db);if(!r.ok)return toast('Geri yükleme reddedildi: '+r.errors.slice(0,3).join('; '),'err');
    if(!await confirmDlg(`Yedek geçerli: ${o.db.categories.length} kategori, ${o.db.topics.length} konu, ${o.db.replies.length} cevap. Mevcut yerel veri değiştirilecek.`,'Geri yükle'))return;
    if(mode==='shared')return toast('Ortak modda geri yükleme yapılamaz; Yerel moda geçin.','err');db=o.db;store.saveLocal(db);recompute();toast('Geri yüklendi','ok');route()}catch(err){toast('Geri yükleme başarısız: '+err.message,'err')}})}
async function catDialog(id){const c=id?db.categories.find(x=>x.id===id):null,skip=new Set(c?descendantIds(db,c.id):[]);
  const v=await dialog(c?'Kategoriyi düzenle':'Yeni kategori',`<label>Ad<input name="name" required maxlength="60" value="${esc(c?.name||'')}"></label><label>Slug (boşsa addan üretilir)<input name="slug" value="${esc(c?.slug||'')}"></label><label>Üst kategori<select name="parentId"><option value="">— (üst düzey)</option>${catOptions(c?.parentId,skip,false)}</select></label><div class="frow"><label>Sıra<input name="order" type="number" value="${c?.order||0}"></label><label class="inl"><input name="active" type="checkbox" ${c&&c.active===false?'':'checked'}> Aktif</label></div><label>Açıklama<input name="description" maxlength="300" value="${esc(c?.description||'')}"></label><label>SEO başlığı<input name="seoTitle" maxlength="70" value="${esc(c?.seoTitle||'')}"></label><label>Meta açıklaması<input name="metaDescription" maxlength="170" value="${esc(c?.metaDescription||'')}"></label>`,{ok:'Kaydet'});
  if(v)op('saveCategory',{...v,id:c?.id,active:v.active==='on'},'Kategori kaydedildi')}
const H_={
  quote(id,b){const k=b.dataset.k,o=k==='t'?db.topics.find(x=>x.id===id):db.replies.find(x=>x.id===id);if(!o||!window.__ed)return;window.__ed.insertHtml(`<blockquote><p><strong>${esc(o.author)}</strong> yazdı:</p><p>${esc(excerpt(o.content,300))}</p></blockquote><p><br></p>`);$('#qr')?.scrollIntoView()},
  async copyLink(id){const tp=db.topics.find(x=>x.id===id),u=mode==='shared'&&S.siteUrl?`${S.siteUrl}/${tp.slug}/${tp.id}/`:location.href;try{await navigator.clipboard.writeText(u);toast('Bağlantı kopyalandı','ok')}catch{await dialog('Bağlantı',`<label>Kopyalayın<input readonly value="${esc(u)}"></label>`,{ok:'Kapat',mount:d=>d.querySelector('input').select()})}},
  bookmark(id,b){const on=store.toggleBm(id);b.setAttribute('aria-pressed',on);toast(on?'Yer imine eklendi':'Yer iminden çıkarıldı')},
  pinTopic(id){const tp=db.topics.find(x=>x.id===id);op('pinTopic',{id,value:!tp.pinned,expectUpdated:tp.updated})},
  lockTopic(id){const tp=db.topics.find(x=>x.id===id);op('lockTopic',{id,value:!tp.locked,expectUpdated:tp.updated})},
  async moveTopic(id){const tp=db.topics.find(x=>x.id===id),v=await dialog('Konuyu taşı',`<label>Hedef kategori<select name="c">${catOptions(tp.categoryId)}</select></label>`,{ok:'Taşı'});if(v)op('moveTopic',{id,categoryId:+v.c,expectUpdated:tp.updated},'Konu taşındı')},
  async deleteTopic(id){const tp=db.topics.find(x=>x.id===id);if(!await confirmDlg(`“${tp.title}” konusu ve tüm cevapları silinecek. Bu işlem geri alınamaz.`))return;const r=await op('deleteTopic',{id,expectUpdated:tp.updated},'Konu silindi');if(r.ok&&!r.shared&&location.hash.startsWith('#/konu'))go('#/')},
  async deleteReply(id){const r0=db.replies.find(x=>x.id===id);if(await confirmDlg('Bu cevap silinecek. Bu işlem geri alınamaz.'))op('deleteReply',{id,expectUpdated:r0.updated},'Cevap silindi')},
  catEdit:id=>catDialog(id),
  async catDel(id){const c=db.categories.find(x=>x.id===id),n=db.topics.filter(x=>x.categoryId===id).length;
    if(n){const v=await dialog('Kategoriyi sil',`<p>“${esc(c.name)}” içinde ${n} konu var. Konular taşınacak:</p><label>Hedef kategori<select name="to">${catOptions(null,new Set([id]),false)}</select></label>`,{ok:'Sil ve taşı'});if(v)op('deleteCategory',{id,moveTo:+v.to},'Kategori silindi')}
    else if(await confirmDlg(`“${c.name}” kategorisi silinecek.`))op('deleteCategory',{id},'Kategori silindi')},
  export(){store.download(`mifrm-yedek-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({format:'mifrm-backup',schema:db.settings.schema,exportedAt:new Date().toISOString(),db},null,1))},
  exportFiles(){store.download('mifrm-data-files.json',JSON.stringify(toFiles(db),null,1))},
  validate(){const r=validateDb(db);$('#vrep').innerHTML=`<div class="notice ${r.ok?'ok':'err'}">${r.ok?'Hata bulunmadı.':`${r.errors.length} hata.`} ${r.warnings.length} uyarı. Bozuk konu: ${r.badTopics.length}, bozuk cevap: ${r.badReplies.length}.</div>${r.errors.length||r.warnings.length?`<ul class="rlist">${[...r.errors.map(e=>'Hata: '+e),...r.warnings.map(w=>'Uyarı: '+w)].map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}`},
  async sync(){if(await confirmDlg('Yerel değişiklikleriniz silinecek ve depodaki veri yüklenecek.','Eşitle')){store.resetLocal();location.reload()}},
  setMode(_,b){store.setMode(b.dataset.m);location.reload()}};
const ROUTES=[[/^$/,homeView],[/^kategori\/(.+)$/,categoryView],[/^konu\/([^/]+)\/(\d+)(?:\/sayfa\/(\d+))?$/,topicView],[/^yeni-konu(?:\/(\d+))?$/,newTopicView],[/^cevap\/(\d+)$/,replyPage],[/^duzenle-konu\/(\d+)$/,editTopicView],[/^duzenle-cevap\/(\d+)$/,editReplyView],[/^ara$/,searchView],[/^yer-imleri$/,bookmarksView],[/^yonetim$/,adminView],[/^hakkinda$/,aboutView]];
function route(){window.__ed=null;const [path,qs]=location.hash.replace(/^#\/?/,'').split('?'),q=new URLSearchParams(qs||'');
  for(const [re,fn] of ROUTES){const m=re.exec(path);if(m){try{fn(m,q)}catch(e){console.error(e);show('Hata',[home(),{name:'Hata'}],`<h1 class="ptitle">Beklenmeyen hata</h1><p class="notice err">${esc(e.message)}</p>`)}return}}nf()}
async function boot(){let repo=null,err=null;try{repo=await store.fetchRepoDb(base)}catch(e){err=e}
  mode=store.getMode();if(repo)repoSettings=repo.settings;if(mode==='shared'&&!repo?.settings.shared?.enabled)mode='local';
  db=mode==='shared'?repo:(store.loadLocal()||repo);
  if(!db){document.getElementById('shell').innerHTML=`<div class="wrap"><h1 class="ptitle">Veri yüklenemedi</h1><p class="notice err">${esc(err?.message||'')}<br>Dosyayı <code>file://</code> ile açtıysanız yerel bir sunucu kullanın (<code>python3 -m http.server</code>) veya GitHub Pages üzerinden açın.</p></div>`;return}
  recompute();document.getElementById('shell').innerHTML=layout(S,K,{mainHtml:'<div id="app"></div>'});
  $('.hsearch').addEventListener('submit',e=>{e.preventDefault();go('#/ara?q='+encodeURIComponent($('#q').value))});
  $('#shell').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b){const id=+b.dataset.id;H_[b.dataset.act]?.(id,b)}});
  const q0=new URLSearchParams(location.search).get('q');if(q0)history.replaceState(null,'',location.pathname+'#/ara?q='+encodeURIComponent(q0));
  addEventListener('hashchange',route);route()}
boot();

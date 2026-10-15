// Tüm yazma işlemleri tek yerde: Yerel Mod (tarayıcı) ve Ortak Mod (GitHub Actions) aynı kuralları uygular.
import {nowIso,slugify,topicSlug,plain} from './util.js';
import {sanitizeHtml,safeUrl} from './sanitize.js';
import {childrenOf,descendantIds,catChain,subtreeDepth} from './schema.js';
export const LIMITS={title:150,content:20000,author:30,name:60,desc:300};
const fail=error=>({ok:false,error});
export function cleanAuthor(a){const v=String(a??'').replace(/[\u0000-\u001f<>]/g,'').trim();return v.length>=2&&v.length<=LIMITS.author?v:null}
export function cleanContent(h){const c=sanitizeHtml(h);if(c.length>LIMITS.content)return {error:`İçerik çok uzun (en çok ${LIMITS.content} karakter HTML)`};
  if(!plain(c)&&!/<(img|figure)/.test(c))return {error:'İçerik boş'};return {html:c}}
const cleanTitle=t=>{const v=String(t??'').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim();return v.length>=3&&v.length<=LIMITS.title?v:null};
const ADMIN=new Set(['editTopic','editReply','deleteTopic','deleteReply','pinTopic','lockTopic','moveTopic','saveCategory','deleteCategory','saveSettings']);
export const PUBLIC_ACTIONS=new Set(['newTopic','newReply']);
function nextId(db,k){const c=(db.settings.counters??={topic:1,reply:1,category:1});const arr={topic:db.topics,reply:db.replies,category:db.categories}[k];
  const id=Math.max(c[k]||1,arr.reduce((m,x)=>Math.max(m,x.id),0)+1);c[k]=id+1;return id}
export function applyAction(db,action,p={},{admin=false,now=nowIso()}={}){
  if(ADMIN.has(action)&&!admin)return fail('Bu işlem için yönetici yetkisi gerekir');
  const S=db.settings,topic=id=>db.topics.find(t=>t.id===+id),reply=id=>db.replies.find(r=>r.id===+id);
  const conflict=(o,k='updated')=>p.expectUpdated&&p.expectUpdated!==o[k]?fail('Çakışma: kayıt siz düzenlerken değişti. Sayfayı yenileyip tekrar deneyin.'):null;
  switch(action){
  case 'newTopic':{const title=cleanTitle(p.title);if(!title)return fail(`Başlık 3-${LIMITS.title} karakter olmalı`);
    const au=cleanAuthor(p.author);if(!au)return fail(`Kullanıcı adı 2-${LIMITS.author} karakter olmalı`);
    const cat=db.categories.find(c=>c.id===+p.categoryId);if(!cat||catChain(db,cat.id).some(c=>c.active===false))return fail('Geçersiz veya pasif kategori');
    const c=cleanContent(p.content);if(c.error)return fail(c.error);
    const id=nextId(db,'topic'),tp={id,slug:topicSlug(title),categoryId:cat.id,title,author:au,content:c.html,created:now,updated:now,pinned:false,locked:false};
    db.topics.push(tp);return {ok:true,id,topic:tp}}
  case 'newReply':{const tp=topic(p.topicId);if(!tp)return fail('Konu bulunamadı');if(tp.locked&&!admin)return fail('Konu kilitli');
    const au=cleanAuthor(p.author);if(!au)return fail(`Kullanıcı adı 2-${LIMITS.author} karakter olmalı`);const c=cleanContent(p.content);if(c.error)return fail(c.error);
    const id=nextId(db,'reply'),r={id,topicId:tp.id,author:au,content:c.html,created:now,updated:now};db.replies.push(r);return {ok:true,id,reply:r}}
  case 'editTopic':{const tp=topic(p.id);if(!tp)return fail('Konu bulunamadı');const cf=conflict(tp);if(cf)return cf;
    if(p.title!==undefined){const t=cleanTitle(p.title);if(!t)return fail('Başlık geçersiz');
      if(t!==tp.title){const old=tp.slug;tp.title=t;tp.slug=topicSlug(t);
        if(old!==tp.slug){db.redirects??=[];if(!db.redirects.some(x=>x.topicId===tp.id&&x.slug===old))db.redirects.push({topicId:tp.id,slug:old});db.redirects=db.redirects.filter(x=>!(x.topicId===tp.id&&x.slug===tp.slug))}}}
    if(p.content!==undefined){const c=cleanContent(p.content);if(c.error)return fail(c.error);tp.content=c.html}
    tp.updated=now;return {ok:true,id:tp.id}}
  case 'editReply':{const r=reply(p.id);if(!r)return fail('Cevap bulunamadı');const cf=conflict(r);if(cf)return cf;const c=cleanContent(p.content);if(c.error)return fail(c.error);r.content=c.html;r.updated=now;return {ok:true,id:r.id}}
  case 'deleteTopic':{const tp=topic(p.id);if(!tp)return fail('Konu bulunamadı');const cf=conflict(tp);if(cf)return cf;
    db.topics=db.topics.filter(t=>t.id!==tp.id);db.replies=db.replies.filter(r=>r.topicId!==tp.id);db.redirects=(db.redirects||[]).filter(x=>x.topicId!==tp.id);return {ok:true}}
  case 'deleteReply':{const r=reply(p.id);if(!r)return fail('Cevap bulunamadı');const cf=conflict(r);if(cf)return cf;db.replies=db.replies.filter(x=>x.id!==r.id);return {ok:true}}
  case 'pinTopic':case 'lockTopic':{const tp=topic(p.id);if(!tp)return fail('Konu bulunamadı');const cf=conflict(tp);if(cf)return cf;tp[action==='pinTopic'?'pinned':'locked']=!!p.value;return {ok:true}}
  case 'moveTopic':{const tp=topic(p.id);if(!tp)return fail('Konu bulunamadı');const cf=conflict(tp);if(cf)return cf;
    const cat=db.categories.find(c=>c.id===+p.categoryId);if(!cat||catChain(db,cat.id).some(c=>c.active===false))return fail('Hedef kategori geçersiz');tp.categoryId=cat.id;return {ok:true}}
  case 'saveCategory':{const name=String(p.name??'').replace(/[\u0000-\u001f<>]/g,'').trim();if(!name||name.length>LIMITS.name)return fail('Kategori adı gerekli');
    const cur=p.id?db.categories.find(c=>c.id===+p.id):null;if(p.id&&!cur)return fail('Kategori bulunamadı');
    const slug=slugify(p.slug||name,60);if(db.categories.some(c=>c.slug===slug&&c.id!==cur?.id))return fail('Bu slug başka bir kategoride kullanılıyor');
    const parentId=p.parentId===''||p.parentId==null?null:+p.parentId;
    if(parentId!=null){const par=db.categories.find(c=>c.id===parentId);if(!par)return fail('Üst kategori bulunamadı');
      if(cur&&descendantIds(db,cur.id).includes(parentId))return fail('Kategori kendi alt kategorisinin altına taşınamaz (döngü)');
      const depth=catChain(db,parentId).length+(cur?subtreeDepth(db,cur.id):1);if(depth>(S.maxCategoryDepth||3))return fail(`En fazla ${S.maxCategoryDepth||3} seviye derinlik desteklenir`)}
    const o={name,slug,description:String(p.description??'').trim().slice(0,LIMITS.desc),parentId,order:Number.isFinite(+p.order)?Math.trunc(+p.order):0,active:p.active!==false,
      seoTitle:String(p.seoTitle??'').trim().slice(0,70),metaDescription:String(p.metaDescription??'').trim().slice(0,170)};
    if(cur){Object.assign(cur,o);return {ok:true,id:cur.id}}
    const id=nextId(db,'category');db.categories.push({id,...o});return {ok:true,id}}
  case 'deleteCategory':{const c=db.categories.find(x=>x.id===+p.id);if(!c)return fail('Kategori bulunamadı');
    if(childrenOf(db,c.id).length)return fail('Önce alt kategorileri silin veya taşıyın');
    const has=db.topics.filter(t=>t.categoryId===c.id);
    if(has.length){const to=db.categories.find(x=>x.id===+p.moveTo&&x.id!==c.id);if(!to)return fail('Kategoride konu var: hedef kategori seçin');has.forEach(t=>t.categoryId=to.id)}
    db.categories=db.categories.filter(x=>x.id!==c.id);return {ok:true}}
  case 'saveSettings':{for(const k of ['siteName','tagline','seoTitle','seoDescription']){if(p[k]!==undefined)S[k]=String(p[k]).replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,160)}
    if(!S.siteName)return fail('Site adı boş olamaz');
    if(p.logoUrl!==undefined){if(p.logoUrl===''||p.logoUrl===null)S.logoUrl='';else{const u=safeUrl(p.logoUrl);if(!u)return fail('Logo adresi http(s) olmalı');S.logoUrl=u}}
    if(p.siteUrl!==undefined){if(p.siteUrl==='')S.siteUrl='';else{const u=safeUrl(p.siteUrl);if(!u)return fail('Site adresi http(s) olmalı');S.siteUrl=u.replace(/\/+$/,'')}}
    return {ok:true}}
  default:return fail('Bilinmeyen işlem: '+action)}}

import {esc,plain} from './core/util.js';
import {sanitizeHtml,safeUrl} from './core/sanitize.js';
import {parseVideoUrl,embedHtml} from './core/video.js';
import {icon} from './core/icons.js';
import {dialog,rt} from './ui.js';
const TOOLS=[['bold','bold','Kalın'],['italic','italic','İtalik'],['underline','underline','Altı çizili'],['strike','strike','Üstü çizili'],'|',['h2','h2','Başlık 2'],['h3','h3','Başlık 3'],['p','p','Paragraf'],'|',['ul','ul','Madde işaretli liste'],['ol','ol','Numaralı liste'],['quote','quote','Alıntı'],['code','code','Kod bloğu'],['hr','minus','Yatay ayraç'],'|',['link','link','Bağlantı ekle veya düzenle'],['image','image','Görsel ekle'],['video','video','Video ekle'],'|',['undo','undo','Geri al'],['redo','redo','Yinele'],'|',['preview','eye','Önizleme'],['source','source','Kaynak görünümü']];
const COMPACT=new Set(['bold','italic','quote','link','image','video','preview','source']);
const lsGet=k=>{try{return localStorage.getItem(k)}catch{return null}},lsSet=(k,v)=>{try{v?localStorage.setItem(k,v):localStorage.removeItem(k)}catch{}};
export function createEditor(root,{key='',compact=false,initial=''}={}){
  const tools=TOOLS.filter(x=>x==='|'?!compact:(!compact||COMPACT.has(x[0])));
  root.innerHTML=`<div class="ed"><div class="ed-bar" role="toolbar" aria-label="Biçimlendirme araçları">${tools.map(x=>x==='|'?'<span class="sep" role="separator"></span>':`<button type="button" class="tb-btn" data-c="${x[0]}" aria-label="${x[2]}" title="${x[2]}">${icon(x[1])}</button>`).join('')}</div><div class="ed-area msg" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Mesaj içeriği"></div><textarea class="ed-src" hidden aria-label="HTML kaynağı" spellcheck="false"></textarea><div class="ed-prev msg" hidden></div><div class="ed-foot small"><span class="ed-count"></span><span class="ed-draft" role="status"></span></div></div>`;
  const q=s=>root.querySelector(s),area=q('.ed-area'),src=q('.ed-src'),prev=q('.ed-prev'),cnt=q('.ed-count'),dr=q('.ed-draft');
  let mode='edit',back='edit',sel=null,tm;const dk='mifrm:draft:'+key;
  try{document.execCommand('defaultParagraphSeparator',false,'p')}catch{}
  const raw=()=>mode==='source'||(mode==='preview'&&back==='source')?src.value:area.innerHTML;
  const clean=()=>sanitizeHtml(raw());
  const count=()=>{const t=plain(raw());cnt.textContent=`${t.length} karakter · ${t?t.split(/\s+/).length:0} kelime`};
  const saveDraft=()=>{if(!key)return;const h=clean();lsSet(dk,plain(h)?h:'');dr.textContent=plain(h)?'Taslak kaydedildi':''};
  const changed=()=>{count();clearTimeout(tm);tm=setTimeout(saveDraft,800)};
  const draft=!initial&&key?lsGet(dk):null;area.innerHTML=sanitizeHtml(initial||draft||'');if(draft)dr.textContent='Taslak geri yüklendi';count();
  const save=()=>{const s=getSelection();if(s.rangeCount&&area.contains(s.anchorNode))sel=s.getRangeAt(0).cloneRange()};
  const restore=()=>{area.focus();if(sel){const s=getSelection();s.removeAllRanges();s.addRange(sel)}};
  const exec=(c,v)=>{area.focus();document.execCommand(c,false,v);changed()};
  const ins=h=>{restore();document.execCommand('insertHTML',false,h);changed()};
  ['keyup','mouseup','blur'].forEach(e=>area.addEventListener(e,save));area.addEventListener('input',changed);src.addEventListener('input',changed);
  area.addEventListener('paste',e=>{e.preventDefault();const cd=e.clipboardData,h=cd.getData('text/html'),tx=cd.getData('text/plain');
    document.execCommand('insertHTML',false,h?sanitizeHtml(h):tx.split(/\n{2,}/).map(p=>`<p>${esc(p).replace(/\n/g,'<br>')}</p>`).join(''))});
  const setMode=m=>{ // edit | source | preview
    if(m==='source'){if(mode==='edit')src.value=clean().replace(/(<\/(p|h2|h3|ul|ol|li|blockquote|pre|figure)>)/g,'$1\n')}
    if(mode==='source'&&m==='edit')area.innerHTML=sanitizeHtml(src.value);
    if(m==='preview'){back=mode;prev.innerHTML=sanitizeHtml(raw(),{expandVideo:true,ctx:rt.ctx})}
    if(mode==='preview'&&m!=='preview'){}
    mode=m;area.hidden=!(m==='edit'||(m==='preview'&&false));area.hidden=m!=='edit';src.hidden=m!=='source';prev.hidden=m!=='preview';
    root.querySelectorAll('.tb-btn').forEach(b=>{const c=b.dataset.c;b.disabled=m!=='edit'&&c!=='preview'&&c!=='source';if(c==='preview')b.setAttribute('aria-pressed',m==='preview');if(c==='source')b.setAttribute('aria-pressed',m==='source')});
    if(m==='preview'){root.querySelector('[data-c=preview]').disabled=false}};
  const A={bold:()=>exec('bold'),italic:()=>exec('italic'),underline:()=>exec('underline'),strike:()=>exec('strikeThrough'),h2:()=>exec('formatBlock','<h2>'),h3:()=>exec('formatBlock','<h3>'),p:()=>exec('formatBlock','<p>'),
    ul:()=>exec('insertUnorderedList'),ol:()=>exec('insertOrderedList'),hr:()=>exec('insertHorizontalRule'),undo:()=>exec('undo'),redo:()=>exec('redo'),
    quote:()=>exec('formatBlock',document.queryCommandValue('formatBlock').toLowerCase()==='blockquote'?'<p>':'<blockquote>'),
    code:()=>{const s=getSelection().toString();ins(`<pre><code>${esc(s||'kod')}</code></pre><p><br></p>`)},
    preview:()=>setMode(mode==='preview'?back:'preview'),source:()=>setMode(mode==='source'?'edit':'source'),
    async link(){save();let a=null,n=sel?.startContainer;while(n&&n!==area){if(n.nodeName==='A'){a=n;break}n=n.parentNode}
      const v=await dialog('Bağlantı',`<label>Adres (URL)<input name="url" type="url" required placeholder="https://" value="${esc(a?.getAttribute('href')||'')}"></label><label>Metin<input name="text" value="${esc(a?a.textContent:sel?sel.toString():'')}"></label>`,{validate:v=>safeUrl(v.url)?'':'Yalnızca http veya https adresleri kabul edilir.'});
      if(!v)return;const u=safeUrl(v.url);restore();if(a){a.setAttribute('href',u);if(v.text)a.textContent=v.text;changed()}else ins(`<a href="${esc(u)}">${esc(v.text||u)}</a>`)},
    async image(){save();const v=await dialog('Görsel ekle (URL ile)',`<label>Görsel adresi<input name="url" type="url" required placeholder="https://"></label><div class="img-prev" aria-live="polite"></div><label>Alternatif metin (zorunlu)<input name="alt" required maxlength="250"></label><div class="frow"><label>Genişlik<select name="w"><option value="w-100">Tam</option><option value="w-75">%75</option><option value="w-50">%50</option><option value="w-25">%25</option></select></label><label>Hizalama<select name="al"><option value="align-left">Sol</option><option value="align-center">Orta</option><option value="align-right">Sağ</option></select></label></div><label>Açıklama (isteğe bağlı)<input name="cap" maxlength="200"></label><input type="hidden" name="iw"><input type="hidden" name="ih"><p class="small">Harici görsellerin kalıcı olacağı garanti değildir. Bu alan dosya yüklemez; yalnızca adres ekler.</p>`,
      {validate:v=>safeUrl(v.url)?'':'Geçerli bir http(s) görsel adresi girin.',mount:d=>{const f=d.querySelector('form'),box=d.querySelector('.img-prev');f.url.addEventListener('change',()=>{box.textContent='';const u=safeUrl(f.url.value);if(!u){box.textContent='Geçersiz adres.';return}
        const im=new Image();im.alt='Önizleme';im.referrerPolicy='no-referrer';im.onload=()=>{f.iw.value=im.naturalWidth;f.ih.value=im.naturalHeight;box.textContent='';box.append(im)};im.onerror=()=>{box.textContent='Görsel yüklenemedi. Eklenebilir ancak yayında kırık görünebilir.'};im.src=u})}});
      if(!v)return;const u=safeUrl(v.url),dim=/^\d+$/.test(v.iw)&&/^\d+$/.test(v.ih)?` width="${v.iw}" height="${v.ih}"`:'';
      ins(`<figure class="image ${v.w} ${v.al}"><img src="${esc(u)}" alt="${esc(v.alt)}"${dim}>${v.cap?`<figcaption>${esc(v.cap)}</figcaption>`:''}</figure><p><br></p>`)},
    async video(){save();const info=u=>{const p=u?parseVideoUrl(u,rt.ctx):null;return !p?'Geçersiz adres.':p.kind==='link'?'Bu bağlantı sayfaya gömülemiyor; güvenli dış bağlantı olarak eklenecek.':`Tanındı: ${p.provider}. Gömülecek (oynatma platformun kısıtlamalarına bağlıdır).`};
      const v=await dialog('Video ekle (URL ile)',`<label>Video adresi<input name="url" type="url" required placeholder="https://"></label><p class="small vi" aria-live="polite"></p><div class="vprev"></div><label>Yönelim<select name="o"><option value="">Yatay (16:9)</option><option value="video-vertical">Dikey (9:16)</option></select></label><p class="small">Desteklenenler: YouTube, Shorts, Vimeo, Dailymotion, Twitch, TikTok, Facebook, Instagram, doğrudan MP4/WebM/Ogg, tanımlı PeerTube sunucuları. X ve bilinmeyen siteler yalnızca bağlantı olur.</p>`,
      {validate:v=>safeUrl(v.url)?'':'Geçerli bir http(s) adresi girin.',mount:d=>{const f=d.querySelector('form');f.url.addEventListener('change',()=>{d.querySelector('.vi').textContent=info(safeUrl(f.url.value));const p=parseVideoUrl(safeUrl(f.url.value)||'',rt.ctx);d.querySelector('.vprev').innerHTML=p&&p.kind!=='link'?embedHtml(p):''})}});
      if(!v)return;ins(`<figure class="video${v.o?' video-vertical':''}" data-video="${esc(safeUrl(v.url))}"></figure><p><br></p>`)}};
  root.querySelector('.ed-bar').addEventListener('click',e=>{const b=e.target.closest('.tb-btn');if(!b||b.disabled)return;if(!['link','image','video','preview','source'].includes(b.dataset.c))restore();A[b.dataset.c]?.()});
  return {getHtml:clean,getText:()=>plain(raw()),setHtml:h=>{area.innerHTML=sanitizeHtml(h);changed()},insertHtml:h=>{area.focus();document.execCommand('insertHTML',false,h);changed()},clearDraft:()=>lsSet(dk,''),focus:()=>area.focus()}}

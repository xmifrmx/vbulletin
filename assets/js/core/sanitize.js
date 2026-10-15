// Allowlist tabanlı HTML temizleyici. DOM'a bağımlı değil (jetonlayıcı); tarayıcıda ve CI'da aynı sonucu verir.
import {parseVideoUrl,embedHtml} from './video.js';
const ALLOWED=new Set(['p','br','strong','em','u','s','h2','h3','ul','ol','li','blockquote','pre','code','a','img','hr','figure','figcaption']);
const MAP={b:'strong',i:'em',strike:'s',del:'s',div:'p',h1:'h2',h4:'h3',h5:'h3',h6:'h3'};
const VOID=new Set(['br','hr','img']);
const BLOCK=new Set(['p','h2','h3','ul','ol','blockquote','pre','hr','figure']);
const CLASSES=new Set(['align-left','align-center','align-right','w-25','w-50','w-75','w-100','video','video-vertical','image']);
const DROP=/<(script|style|iframe|object|embed|template|noscript|svg|math|frameset|applet|textarea|title)\b[\s\S]*?<\/\1\s*>/gi;
const TAG=/<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g;
const escT=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const escA=s=>escT(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function decodeEntities(s){return String(s).replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(m,e)=>{e=e.toLowerCase();
  if(e[0]==='#'){const n=e[1]==='x'?parseInt(e.slice(2),16):parseInt(e.slice(1),10);return n>0&&n<0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):''}
  return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[e]})}
// Yalnızca http(s). javascript:, data:, vbscript: vb. ve kimlik bilgili URL'ler reddedilir.
export function safeUrl(u){if(typeof u!=='string')return null;
  const v=decodeEntities(u).replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]+/g,'');
  if(!/^https?:\/\//i.test(v)||v.length>2048)return null;
  try{const x=new URL(v);return /^https?:$/.test(x.protocol)&&!x.username&&!x.password?x.href:null}catch{return null}}
function attrs(s){const o={};const re=/([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;let m;
  while((m=re.exec(s)))o[m[1].toLowerCase()]=decodeEntities(m[2]??m[3]??m[4]??'');return o}
const cls=v=>String(v||'').split(/\s+/).filter(c=>CLASSES.has(c)).join(' ');
export function sanitizeHtml(src,{expandVideo=false,ctx={}}={}){
  const s=String(src??'').replace(/<!--[\s\S]*?-->/g,'').replace(DROP,'');
  const out=[],stack=[];let last=0,m;const re=new RegExp(TAG.source,'g');
  const close=()=>out.push(`</${stack.pop()}>`);
  const needP=()=>{if(!stack.length){out.push('<p>');stack.push('p')}};
  const text=x=>{if(!x)return;const v=escT(decodeEntities(x));if(!v.trim()){if(stack.length)out.push(v);return}needP();out.push(v)};
  while((m=re.exec(s))){
    text(s.slice(last,m.index));last=re.lastIndex;
    let name=m[2].toLowerCase();name=MAP[name]||name;if(!ALLOWED.has(name))continue;
    if(m[1]){if(VOID.has(name))continue;const i=stack.lastIndexOf(name);if(i<0)continue;while(stack.length>i)close();continue}
    const a=attrs(m[3]);
    if(BLOCK.has(name))while(stack.at(-1)==='p')close();
    else if(name==='li'&&stack.at(-1)==='li')close();
    else if(name!=='li'&&name!=='figcaption')needP();
    if(name==='figure'&&a['data-video']!==undefined){
      const u=safeUrl(a['data-video']);
      const e=s.toLowerCase().indexOf('</figure',re.lastIndex);if(e>=0){const g=s.indexOf('>',e);re.lastIndex=last=g<0?s.length:g+1}
      if(u)out.push(expandVideo?embedHtml(parseVideoUrl(u,ctx)):`<figure class="video${/video-vertical/.test(a.class||'')?' video-vertical':''}" data-video="${escA(u)}"></figure>`);
      continue}
    if(name==='a'){const u=safeUrl(a.href);if(!u)continue;out.push(`<a href="${escA(u)}" rel="nofollow ugc noopener noreferrer" target="_blank">`);stack.push('a');continue}
    if(name==='img'){const u=safeUrl(a.src);if(!u)continue;const d=k=>/^\d{1,4}$/.test(a[k]||'')&&+a[k]>0?` ${k}="${a[k]}"`:'';
      out.push(`<img src="${escA(u)}" alt="${escA((a.alt||'').slice(0,250))}" loading="lazy" decoding="async"${d('width')}${d('height')}>`);continue}
    if(name==='figure'){const c=cls(a.class);out.push(`<figure${c?` class="${c}"`:''}>`);stack.push('figure');continue}
    if(name==='p'){const c=cls(a.class);out.push(`<p${c&&/^align-/.test(c)?` class="${c}"`:''}>`);stack.push('p');continue}
    out.push(VOID.has(name)?`<${name}>`:`<${name}>`);if(!VOID.has(name))stack.push(name)}
  text(s.slice(last));while(stack.length)close();
  return out.join('').replace(/<p>(\s|<br>)*<\/p>/g,'').replace(/^(\s|<br>)+|(\s|<br>)+$/g,'').trim();
}

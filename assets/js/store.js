// Tarayıcı deposu (Yerel Mod) + depo verisini okuma + Ortak Mod için issue bağlantısı üretme.
const KEY='mifrm:db:v1',PRIV='mifrm:priv:v1',MODE='mifrm:mode',BM='mifrm:bm',AU='mifrm:author';
const ls={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}}};
export async function fetchRepoDb(base){
  const j=async p=>{const r=await fetch(base+p,{cache:'no-cache'});if(!r.ok)throw new Error(p+' → '+r.status);return JSON.parse(await r.text())};
  const [settings,categories,index,redirects]=await Promise.all([j('settings.txt'),j('categories.txt'),j('index.txt'),j('redirects.txt').catch(()=>[])]);
  const db={schema:settings.schema,settings,categories,topics:[],replies:[],redirects};
  await Promise.all(index.topics.map(async m=>{const [t,r]=await Promise.all([j(`topics/${m.id}.txt`),j(`replies/${m.id}.txt`).catch(()=>[])]);db.topics.push(t);db.replies.push(...r)}));
  db.topics.sort((a,b)=>a.id-b.id);return db}
export const loadLocal=()=>ls.get(KEY,null);
export const saveLocal=db=>{if(!ls.set(KEY,db))throw new Error('Tarayıcı depolaması dolu veya kapalı; yedek alın.')};
export const resetLocal=()=>{try{localStorage.removeItem(KEY)}catch{}};
export const getMode=()=>ls.get(MODE,'local');export const setMode=m=>ls.set(MODE,m);
export const getBm=()=>ls.get(BM,[]);
export function toggleBm(id){const a=getBm(),i=a.indexOf(id);i<0?a.push(id):a.splice(i,1);ls.set(BM,a);return i<0}
export const getAuthor=()=>ls.get(AU,'');export const setAuthor=v=>ls.set(AU,v);
// E-posta yalnızca bu tarayıcıda, ayrı anahtarda tutulur; yedeğe/dışa aktarıma/HTML'e/JSON-LD'ye girmez.
export function setPrivate(k,email){if(!email)return;const o=ls.get(PRIV,{});o[k]=email;ls.set(PRIV,o)}
export function download(name,text,type='application/json'){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:type+';charset=utf-8'}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500)}
// Ortak Mod: tarayıcı depoya yazamaz; önceden doldurulmuş bir GitHub issue açılır, Actions doğrular ve işler.
export function submitIssue(shared,action,payload){
  if(!shared?.enabled||!/^[\w.-]+\/[\w.-]+$/.test(shared.repo||''))return {ok:false,error:'Ortak yayın bu sitede etkin değil (settings.txt → shared).'};
  const body='```json\n'+JSON.stringify({action,payload})+'\n```\n\n_Bu issue otomatik işlenir. Lütfen düzenlemeyin; yalnızca "Submit new issue" düğmesine basın._';
  const url=`https://github.com/${shared.repo}/issues/new?title=${encodeURIComponent('[mifrm] '+action)}&body=${encodeURIComponent(body)}`;
  if(url.length>7500)return {ok:false,error:'İçerik, GitHub bağlantı sınırı için fazla uzun. Kısaltın.'};
  window.open(url,'_blank','noopener');return {ok:true,shared:true}}

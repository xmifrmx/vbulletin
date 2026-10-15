// Saf (DOM'suz) yardımcılar: tarayıcıda ve Node'da aynı kod çalışır.
const M={ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u'};
export function slugify(s,max=80){
  const t=String(s??'').replace(/İ/g,'i').replace(/I/g,'i').toLowerCase()
    .replace(/[çğıöşü]/g,c=>M[c]).normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/&/g,' ve ').replace(/[^a-z0-9]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')
    .slice(0,max).replace(/-$/,'');
  return t||'konu';
}
// Konu slug'ı dizin adlarıyla çakışmasın (/kategori/, /app/ ...).
export const RESERVED=new Set(['kategori','app','assets','data','tools','sitemap','robots','404']);
export const topicSlug=title=>{const s=slugify(title);return RESERVED.has(s)?s+'-konu':s};
export const esc=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export const nowIso=()=>new Date().toISOString().replace(/\.\d+Z$/,'Z');
export const isIso=s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?(Z|[+-]\d\d:\d\d)$/.test(s)&&!isNaN(Date.parse(s));
export const fmtDate=(s,lang='tr-TR')=>{const d=new Date(s);return isNaN(d)?'':d.toLocaleString(lang,{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Istanbul'})};
export const plain=h=>String(h||'').replace(/<(br|\/p|\/h2|\/h3|\/li|\/blockquote|\/pre|\/figure)[^>]*>/gi,' ').replace(/<[^>]+>/g,'')
  .replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
export const excerpt=(h,n=160)=>{const p=plain(h);return p.length>n?p.slice(0,n-1).trimEnd()+'…':p};
export const hashStr=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return (h>>>0).toString(36)};

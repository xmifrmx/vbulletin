import {isIso} from './util.js';
export const SCHEMA=1;
export const catMap=db=>new Map(db.categories.map(c=>[c.id,c]));
export function catChain(db,id){const m=catMap(db),out=[],seen=new Set();let c=m.get(id);while(c&&!seen.has(c.id)){seen.add(c.id);out.unshift(c);c=c.parentId!=null?m.get(c.parentId):null}return out}
export const catPath=(db,id)=>catChain(db,id).map(c=>c.slug).join('/');
export const childrenOf=(db,pid)=>db.categories.filter(c=>(c.parentId??null)===(pid??null)).sort((a,b)=>((a.order||0)-(b.order||0))||a.name.localeCompare(b.name,'tr'));
export function descendantIds(db,id,seen=new Set()){if(seen.has(id))return [];seen.add(id);const r=[id];for(const c of childrenOf(db,id))r.push(...descendantIds(db,c.id,seen));return r}
export function subtreeDepth(db,id,seen=new Set()){if(seen.has(id))return 0;seen.add(id);return 1+Math.max(0,...childrenOf(db,id).map(c=>subtreeDepth(db,c.id,seen)))}
export function topicStats(db){const m=new Map();for(const t of db.topics)m.set(t.id,{replyCount:0,lastAt:t.created,lastBy:t.author,lastReplyId:null});
  for(const r of db.replies){const s=m.get(r.topicId);if(!s)continue;s.replyCount++;if(r.created>=s.lastAt){s.lastAt=r.created;s.lastBy=r.author;s.lastReplyId=r.id}}return m}
// Pasif kategoriler (ve altları) ve içindeki konular herkese açık görünümden çıkar.
export function publicView(db){const ok=new Set(db.categories.filter(c=>catChain(db,c.id).every(x=>x.active!==false)).map(c=>c.id));
  const topics=db.topics.filter(t=>ok.has(t.categoryId));const ids=new Set(topics.map(t=>t.id));
  return {...db,categories:db.categories.filter(c=>ok.has(c.id)),topics,replies:db.replies.filter(r=>ids.has(r.topicId))}}
const SLUG=/^[a-z0-9]+(-[a-z0-9]+)*$/;
export function validateDb(db){const errors=[],warnings=[],badT=new Set(),badR=new Set();const S=db.settings||{};
  if(S.schema!==SCHEMA)errors.push(`Desteklenmeyen şema sürümü: ${S.schema} (beklenen ${SCHEMA})`);
  const maxD=S.maxCategoryDepth||3,ids=new Set(),slugs=new Set();
  for(const c of db.categories){
    if(!Number.isInteger(c.id)||c.id<1)errors.push(`Kategori kimliği geçersiz: ${c.id}`);
    if(ids.has(c.id))errors.push(`Yinelenen kategori kimliği: ${c.id}`);ids.add(c.id);
    if(!SLUG.test(c.slug||''))errors.push(`Kategori ${c.id}: geçersiz slug "${c.slug}"`);
    if(slugs.has(c.slug))errors.push(`Yinelenen kategori slug'ı: ${c.slug}`);slugs.add(c.slug);
    if(!c.name)errors.push(`Kategori ${c.id}: ad boş`);}
  const m=catMap(db);
  for(const c of db.categories){if(c.parentId!=null&&!m.has(c.parentId))errors.push(`Kategori ${c.id}: üst kategori ${c.parentId} yok`);
    const seen=new Set([c.id]);let x=c,d=1,cyc=false;
    while(x&&x.parentId!=null){x=m.get(x.parentId);if(!x)break;if(seen.has(x.id)){cyc=true;break}seen.add(x.id);d++}
    if(cyc)errors.push(`Kategori döngüsü: ${c.id}`);else if(d>maxD)errors.push(`Kategori ${c.id}: derinlik ${d} > izin verilen ${maxD}`)}
  const tids=new Set();
  for(const t of db.topics){const bad=e=>{errors.push(`Konu ${t.id}: ${e}`);badT.add(t.id)};
    if(!Number.isInteger(t.id)||t.id<1)bad('kimlik geçersiz');if(tids.has(t.id))bad('yinelenen kimlik');tids.add(t.id);
    if(!m.has(t.categoryId))bad(`kategori ${t.categoryId} yok`);if(!t.title||t.title.length>150)bad('başlık geçersiz');
    if(!SLUG.test(t.slug||''))bad(`geçersiz slug "${t.slug}"`);if(!t.author)bad('yazar adı boş');if(!t.content)bad('içerik boş');
    if(!isIso(t.created)||!isIso(t.updated))bad('tarih geçersiz');else if(t.updated<t.created)warnings.push(`Konu ${t.id}: düzenleme tarihi yayın tarihinden önce`)}
  const rids=new Set();
  for(const r of db.replies){const bad=e=>{errors.push(`Cevap ${r.id}: ${e}`);badR.add(r.id)};
    if(!Number.isInteger(r.id)||r.id<1)bad('kimlik geçersiz');if(rids.has(r.id))bad('yinelenen kimlik');rids.add(r.id);
    if(!tids.has(r.topicId))bad(`konu ${r.topicId} yok`);if(!r.author)bad('yazar adı boş');if(!r.content)bad('içerik boş');
    if(!isIso(r.created)||!isIso(r.updated))bad('tarih geçersiz')}
  for(const x of db.redirects||[])if(!tids.has(x.topicId)||!SLUG.test(x.slug||''))warnings.push(`Geçersiz yönlendirme kaydı: ${JSON.stringify(x)}`);
  return {ok:!errors.length,errors,warnings,badTopics:[...badT],badReplies:[...badR]}}

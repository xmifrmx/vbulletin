// data/ klasör düzeni ⇄ bellekteki db. Hem tarayıcı dışa aktarımı hem Node araçları kullanır.
import {topicStats,SCHEMA} from './schema.js';
const J=o=>JSON.stringify(o,null,2)+'\n';
export function toFiles(db){const st=topicStats(db),f={};
  f['settings.txt']=J({...db.settings,schema:db.settings.schema||SCHEMA});
  f['categories.txt']=J([...db.categories].sort((a,b)=>a.id-b.id));
  f['redirects.txt']=J(db.redirects||[]);
  const tps=[...db.topics].sort((a,b)=>a.id-b.id),by=new Map();
  for(const r of db.replies){if(!by.has(r.topicId))by.set(r.topicId,[]);by.get(r.topicId).push(r)}
  f['index.txt']=J({schema:SCHEMA,topics:tps.map(t=>{const s=st.get(t.id);return {id:t.id,slug:t.slug,title:t.title,categoryId:t.categoryId,author:t.author,created:t.created,updated:t.updated,pinned:!!t.pinned,locked:!!t.locked,replyCount:s.replyCount,lastAt:s.lastAt,lastBy:s.lastBy}})});
  for(const t of tps){f[`topics/${t.id}.txt`]=J(t);const rs=(by.get(t.id)||[]).sort((a,b)=>a.id-b.id);if(rs.length)f[`replies/${t.id}.txt`]=J(rs)}
  return f}
export function fromFiles(files){const g=k=>files[k]!==undefined?JSON.parse(files[k]):null;
  const settings=g('settings.txt'),db={schema:settings?.schema,settings,categories:g('categories.txt')||[],topics:[],replies:[],redirects:g('redirects.txt')||[]};
  for(const k of Object.keys(files).sort()){if(/^topics\/\d+\.txt$/.test(k))db.topics.push(JSON.parse(files[k]));else if(/^replies\/\d+\.txt$/.test(k))db.replies.push(...JSON.parse(files[k]))}
  return db}

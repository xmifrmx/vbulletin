import fs from 'node:fs';import path from 'node:path';
import {toFiles} from '../../assets/js/core/files.js';
const rj=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export function loadDb(dir){
  const settings=rj(path.join(dir,'settings.txt')),rp=path.join(dir,'redirects.txt');
  const db={schema:settings.schema,settings,categories:rj(path.join(dir,'categories.txt')),topics:[],replies:[],redirects:fs.existsSync(rp)?rj(rp):[]};
  const td=path.join(dir,'topics');
  if(fs.existsSync(td))for(const f of fs.readdirSync(td).filter(f=>/^\d+\.txt$/.test(f)).sort((a,b)=>parseInt(a)-parseInt(b))){
    db.topics.push(rj(path.join(td,f)));const r=path.join(dir,'replies',f);if(fs.existsSync(r))db.replies.push(...rj(r))}
  return db}
export function saveDb(dir,db){const files=toFiles(db);
  for(const sub of ['topics','replies']){const d=path.join(dir,sub);fs.mkdirSync(d,{recursive:true});
    for(const f of fs.readdirSync(d))if(f.endsWith('.txt')&&!files[`${sub}/${f}`])fs.rmSync(path.join(d,f))}
  for(const [p,c] of Object.entries(files)){const fp=path.join(dir,p);fs.mkdirSync(path.dirname(fp),{recursive:true});fs.writeFileSync(fp,c)}}

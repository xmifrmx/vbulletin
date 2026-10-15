// GitHub Actions: "[mifrm] <işlem>" başlıklı issue'daki JSON'u doğrular, data/ klasörüne uygular.
// Yetki: yönetici işlemleri yalnızca OWNER/MEMBER/COLLABORATOR issue sahiplerinden (GitHub sunucu tarafı author_association).
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {loadDb,saveDb} from './lib/fsdata.mjs';import {applyAction,PUBLIC_ACTIONS} from '../assets/js/core/actions.js';
import {validateDb} from '../assets/js/core/schema.js';import {hashStr,plain} from '../assets/js/core/util.js';
const DATA=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../data'),RL=path.join(DATA,'ratelimit.txt');
const done=(ok,msg,changed=false)=>{fs.writeFileSync('result.md',msg+'\n');if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,`ok=${ok}\nchanged=${changed?1:0}\n`);console.log(ok?'OK':'RED',msg);process.exit(0)};
const is=JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH,'utf8')).issue;
if((is.body||'').length>70000)done(false,'❌ İstek çok büyük.');
const m=/```json\s*([\s\S]*?)```/.exec(is.body||'');if(!m)done(false,'❌ JSON bloğu bulunamadı.');
let req;try{req=JSON.parse(m[1])}catch{done(false,'❌ JSON ayrıştırılamadı.')}
if(!req||typeof req.action!=='string'||typeof req.payload!=='object'||!req.payload)done(false,'❌ Geçersiz istek biçimi.');
const db=loadDb(DATA),S=db.settings;
if(!S.shared?.enabled)done(false,'❌ Ortak yayın modu bu depoda kapalı (settings.txt → shared.enabled).');
const admin=['OWNER','MEMBER','COLLABORATOR'].includes(is.author_association),user=is.user.login;
const rl=fs.existsSync(RL)?JSON.parse(fs.readFileSync(RL,'utf8')):{entries:[]},now=Date.now();
rl.entries=rl.entries.filter(e=>now-e.at<86400000);
if(!admin){
  if(!PUBLIC_ACTIONS.has(req.action))done(false,'❌ Bu işlem için yönetici yetkisi gerekir (depo sahibi/ortak).');
  const lim=S.rateLimitPerHour||5;if(rl.entries.filter(e=>e.u===user&&now-e.at<3600000).length>=lim)done(false,`❌ Hız sınırı: saatte en çok ${lim} gönderi.`);
  const txt=String(req.payload.content||'');const links=(txt.match(/https?:\/\//gi)||[]).length;
  if(links>(S.maxLinks??5))done(false,'❌ Çok fazla bağlantı (spam koruması).');
  const low=plain(txt+' '+(req.payload.title||'')).toLocaleLowerCase('tr');if((S.spamWords||[]).some(w=>w&&low.includes(String(w).toLocaleLowerCase('tr'))))done(false,'❌ İçerik spam filtresine takıldı.')}
const h=hashStr(req.action+'|'+JSON.stringify(req.payload.content||req.payload.title||''));
if(!admin&&rl.entries.some(e=>e.h===h))done(false,'❌ Aynı içerik daha önce gönderilmiş.');
const r=applyAction(db,req.action,req.payload,{admin});if(!r.ok)done(false,'❌ '+r.error);
const v=validateDb(db);if(!v.ok)done(false,'❌ Veri bütünlüğü kontrolü başarısız; işlem geri alındı.');
saveDb(DATA,db);rl.entries.push({u:user,at:now,h});fs.writeFileSync(RL,JSON.stringify(rl,null,1)+'\n');
done(true,`✅ İşlem uygulandı (${req.action}${r.id?` #${r.id}`:''}). Site birkaç dakika içinde yeniden yayımlanacak.`,true);

// Derleme sonrası denetim: kırık iç bağlantılar, canonical/sitemap tutarlılığı, tek H1, JSON-LD geçerliliği.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const OUT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../_site');
const S=JSON.parse(fs.readFileSync(path.join(OUT,'data/settings.txt'),'utf8'));
const site=S.siteUrl.replace(/\/+$/,''),BASE=new URL(site).pathname.replace(/\/+$/,'');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const all=walk(OUT),htmls=all.filter(f=>f.endsWith('.html')),errs=[];let links=0;
const exists=u=>{let p=u.split('#')[0].split('?')[0];if(BASE&&p.startsWith(BASE))p=p.slice(BASE.length);else if(BASE&&p.startsWith('/'))return false;
  const f=path.join(OUT,decodeURIComponent(p));return fs.existsSync(f)&&(!fs.statSync(f).isDirectory()||fs.existsSync(path.join(f,'index.html')))};
const canon=new Map();
for(const f of htmls){const h=fs.readFileSync(f,'utf8'),rel=path.relative(OUT,f);if(rel.startsWith('app')||rel.startsWith('data'))continue;
  for(const m of h.matchAll(/(?:href|src)="(\/[^"]*)"/g)){links++;if(!exists(m[1].replace(/&amp;/g,'&')))errs.push(`${rel}: kırık bağlantı ${m[1]}`)}
  const c=/<link rel="canonical" href="([^"]+)"/.exec(h);if(!c)errs.push(`${rel}: canonical yok`);else canon.set(rel,c[1]);
  if(!/noindex/.test(h)||rel==='404.html'){const n=(h.match(/<h1[ >]/g)||[]).length;if(n!==1&&!/http-equiv="refresh"/.test(h))errs.push(`${rel}: ${n} adet H1`)}
  if(!/<title>[^<]+<\/title>/.test(h))errs.push(`${rel}: title yok`);if(!/name="description"/.test(h)&&!/refresh/.test(h))errs.push(`${rel}: description yok`);
  for(const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)){try{JSON.parse(m[1])}catch{errs.push(`${rel}: JSON-LD bozuk`)}}}
const locs=[];for(const f of all.filter(f=>/sitemap-(categories|topics-\d+)\.xml$/.test(f))){const x=fs.readFileSync(f,'utf8');
  for(const m of x.matchAll(/<loc>([^<]+)<\/loc>/g))locs.push(m[1]);for(const m of x.matchAll(/<lastmod>([^<]+)<\/lastmod>/g))if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/.test(m[1]))errs.push('Geçersiz lastmod '+m[1])}
if(new Set(locs).size!==locs.length)errs.push('Sitemap içinde yinelenen URL');
const canons=new Set(canon.values());for(const l of locs){if(!canons.has(l))errs.push(`Sitemap URL'si canonical ile eşleşmiyor: ${l}`);if(!exists(l.slice(site.length-BASE.length)))errs.push(`Sitemap URL'si için dosya yok: ${l}`)}
console.log(`${htmls.length} HTML, ${links} iç bağlantı, ${locs.length} sitemap URL'si denetlendi.`);
if(errs.length){errs.forEach(e=>console.error('HATA:',e));process.exit(1)}console.log('check: temiz');

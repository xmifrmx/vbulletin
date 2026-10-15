// Statik site üretici: data/ → _site/ (gerçek HTML sayfaları, JSON-LD, sitemap, robots, 404, yönlendirmeler).
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {loadDb} from './lib/fsdata.mjs';
import {esc,excerpt,plain} from '../assets/js/core/util.js';
import {validateDb,publicView,topicStats,catPath,catChain,childrenOf,SCHEMA} from '../assets/js/core/schema.js';
import {setLang,t} from '../assets/js/core/i18n.js';
import {layout,crumbs} from '../assets/js/core/layout.js';
import {forumBlock,topicRows,postHtml,paginationHtml,homeBody,pageCount,time} from '../assets/js/core/views.js';
import {safeUrl} from '../assets/js/core/sanitize.js';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),OUT=path.join(ROOT,'_site');
const full=loadDb(path.join(ROOT,'data')),rep=validateDb(full);
rep.warnings.forEach(w=>console.warn('UYARI:',w));
if(!rep.ok){rep.errors.forEach(e=>console.error('HATA:',e));process.exit(1)}
const db=publicView(full),S=db.settings,stats=topicStats(db);setLang(S.lang||'tr');
let site=(S.siteUrl||'').replace(/\/+$/,'');if(!/^https?:\/\//.test(site)){console.warn('UYARI: siteUrl geçersiz, örnek değer kullanılıyor');site='https://example.com'}
if(/example\.(com|github\.io)/.test(site))console.warn('UYARI: siteUrl hâlâ örnek değer; data/settings.txt içinde gerçek adresinizi yazın (canonical/sitemap için şart).');
const BASE=new URL(site).pathname.replace(/\/+$/,''),href=p=>BASE+p,ABS=p=>site+p;
const topicPath=(tp,pg=1)=>`/${tp.slug}/${tp.id}/${pg>1?`sayfa/${pg}/`:''}`;
const catUrl=(c,pg=1)=>`/kategori/${catPath(db,c.id)}/${pg>1?`sayfa/${pg}/`:''}`;
const L={cat:c=>href(catUrl(c)),topic:(tp,pg=1,a)=>href(topicPath(tp,pg))+(a?'#'+a:'')};
const K={home:href('/'),newTopic:href('/app/#/yeni-konu'),search:href('/app/#/ara'),bookmarks:href('/app/#/yer-imleri'),admin:href('/app/#/yonetim'),about:href('/app/#/hakkinda'),searchAction:href('/app/'),sitemap:href('/sitemap.xml'),interactive:href('/app/')};
const ctx={parent:new URL(site).hostname,peertubeHosts:S.peertubeHosts||[]};
const ldjson=o=>JSON.stringify(o).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
const W=(rel,c)=>{const f=path.join(OUT,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,c)};
const bc=items=>({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((it,i)=>({'@type':'ListItem',position:i+1,name:it.name,item:ABS(it.path)}))});
function doc({title,desc,p,robots='index,follow',type='website',ld=[],items,main}){const url=ABS(p),e=esc;
  const head=`<!doctype html><html lang="${e(S.lang||'tr')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><meta name="description" content="${e(desc)}"><link rel="canonical" href="${e(url)}"><meta name="robots" content="${robots}"><meta property="og:type" content="${type}"><meta property="og:title" content="${e(title)}"><meta property="og:description" content="${e(desc)}"><meta property="og:url" content="${e(url)}"><meta property="og:site_name" content="${e(S.siteName)}"><meta property="og:locale" content="${S.lang==='en'?'en_US':'tr_TR'}"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${e(title)}"><meta name="twitter:description" content="${e(desc)}"><link rel="stylesheet" href="${href('/assets/css/forum.css')}">${ld.map(o=>`<script type="application/ld+json">${ldjson(o)}</script>`).join('')}</head><body>`;
  return head+layout(S,K,{crumbsHtml:crumbs(items.map(i=>({name:i.name,href:i.path&&href(i.path)}))),mainHtml:main})+`<script src="${href('/assets/js/menu.js')}" defer></script></body></html>`}
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
for(const d of ['assets','app','data'])fs.cpSync(path.join(ROOT,d),path.join(OUT,d),{recursive:true});
fs.rmSync(path.join(OUT,'data/ratelimit.txt'),{force:true});W('.nojekyll','');
const homeItem={name:S.siteName,path:'/'},sitemapTopics=[],sitemapCats=[];
const lastmodOf=tp=>[tp.updated,...db.replies.filter(r=>r.topicId===tp.id).map(r=>r.updated)].sort().at(-1);
// Ana sayfa
{const lm=db.topics.map(lastmodOf).sort().at(-1);
 W('index.html',doc({title:S.seoTitle||`${S.siteName} - ${S.tagline||''}`.replace(/ - $/,''),desc:S.seoDescription||`${S.siteName} forumu`,p:'/',items:[{name:S.siteName}],
  ld:[{'@context':'https://schema.org','@type':'WebSite',name:S.siteName,url:ABS('/'),inLanguage:S.lang||'tr',potentialAction:{'@type':'SearchAction',target:{'@type':'EntryPoint',urlTemplate:ABS('/app/')+'?q={search_term_string}'},'query-input':'required name=search_term_string'}},
      {'@context':'https://schema.org','@type':'Organization',name:S.siteName,url:ABS('/'),...(S.logoUrl&&safeUrl(S.logoUrl)?{logo:S.logoUrl}:{})}],
  main:`<h1 class="ptitle">${esc(S.siteName)}${S.tagline?` <small>${esc(S.tagline)}</small>`:''}</h1>`+homeBody(db,stats,L,ctx)}));
 sitemapCats.push({loc:ABS('/'),lastmod:lm})}
// Kategoriler (sayfalı)
const per=S.topicsPerPage||20;
for(const c of db.categories){const list=db.topics.filter(x=>x.categoryId===c.id).sort((a,b)=>(b.pinned-a.pinned)||stats.get(b.id).lastAt.localeCompare(stats.get(a.id).lastAt));
  const pages=pageCount(list.length,per),chain=catChain(db,c.id);
  for(let pg=1;pg<=pages;pg++){const p=catUrl(c,pg),title=(c.seoTitle||c.name)+(pg>1?` - ${t('page')} ${pg}`:''),desc=c.metaDescription||c.description||`${c.name}: ${list.length} konu`;
    const items=[homeItem,...chain.map((x,i)=>({name:x.name,path:i<chain.length-1||pg>1?catUrl(x):undefined})) ];
    items[items.length-1]=pg>1?items[items.length-1]:{name:c.name};if(pg>1)items.push({name:`${t('page')} ${pg}`});
    const ldItems=[homeItem,...chain.map(x=>({name:x.name,path:catUrl(x)}))];
    W(p.slice(1)+'index.html',doc({title:`${title} - ${S.siteName}`,desc,p,items,
      ld:[{'@context':'https://schema.org','@type':'CollectionPage',name:c.name,url:ABS(p),description:desc,inLanguage:S.lang||'tr'},bc(ldItems)],
      main:`<h1 class="ptitle">${esc(c.name)}</h1>${c.description?`<p>${esc(c.description)}</p>`:''}${childrenOf(db,c.id).length?forumBlock(db,stats,L,c):''}${topicRows(db,stats,L,list.slice((pg-1)*per,pg*per))}${paginationHtml(pg,pages,n=>href(catUrl(c,n)))}`}))}
  const lm=list.map(lastmodOf).sort().at(-1);if(lm)sitemapCats.push({loc:ABS(catUrl(c)),lastmod:lm})}
// Konular (sayfalı)
const rper=S.repliesPerPage||10,byTopic=new Map();for(const r of db.replies){if(!byTopic.has(r.topicId))byTopic.set(r.topicId,[]);byTopic.get(r.topicId).push(r)}
for(const tp of db.topics){const reps=(byTopic.get(tp.id)||[]).sort((a,b)=>a.id-b.id),pages=pageCount(reps.length,rper),chain=catChain(db,tp.categoryId),cat=chain.at(-1);
  const sib=db.topics.filter(x=>x.categoryId===tp.categoryId).sort((a,b)=>a.id-b.id),i=sib.findIndex(x=>x.id===tp.id),prev=sib[i-1],next=sib[i+1];
  for(let pg=1;pg<=pages;pg++){const p=topicPath(tp,pg),url=ABS(p),slice=reps.slice((pg-1)*rper,pg*rper);
    const posts=(pg===1?postHtml({ctx,id:0,author:tp.author,created:tp.created,updated:tp.updated,content:tp.content,no:1,owner:true,perma:'#post-0'}):'')+
      slice.map((r,k)=>postHtml({ctx,id:r.id,author:r.author,created:r.created,updated:r.updated,content:r.content,no:(pg-1)*rper+k+2,perma:'#post-'+r.id})).join('');
    const items=[homeItem,...chain.map(x=>({name:x.name,path:catUrl(x)})),{name:tp.title,path:pg>1?topicPath(tp):undefined}];if(pg>1)items.push({name:`${t('page')} ${pg}`});
    const nav=`<nav class="topicnav" aria-label="${t('topicNav')}">${prev?`<a href="${esc(L.topic(prev))}" rel="prev">${t('prevTopic')}: ${esc(prev.title)}</a>`:'<span></span>'}${next?`<a href="${esc(L.topic(next))}" rel="next">${t('nextTopic')}: ${esc(next.title)}</a>`:''}</nav>`;
    const ld=[bc(items.filter(x=>x.path||x.name===tp.title).map(x=>({name:x.name,path:x.path||topicPath(tp)})) )];
    if(pg===1)ld.unshift({'@context':'https://schema.org','@type':'DiscussionForumPosting','@id':url,mainEntityOfPage:url,url,headline:tp.title,text:plain(tp.content),inLanguage:S.lang||'tr',
      author:{'@type':'Person',name:tp.author},datePublished:tp.created,dateModified:tp.updated,
      interactionStatistic:{'@type':'InteractionCounter',interactionType:'https://schema.org/CommentAction',userInteractionCount:reps.length},
      ...(slice.length?{comment:slice.map(r=>({'@type':'Comment','@id':`${url}#post-${r.id}`,url:`${url}#post-${r.id}`,text:plain(r.content),author:{'@type':'Person',name:r.author},datePublished:r.created,dateModified:r.updated}))}:{})});
    const desc=excerpt(pg===1?tp.content:(slice[0]?.content||tp.content),155)||tp.title;
    W(p.slice(1)+'index.html',doc({title:`${tp.title}${pg>1?` - ${t('page')} ${pg}`:''} - ${S.siteName}`,desc,p,type:'article',ld,items,
      main:`<h1 class="ptitle">${esc(tp.title)}</h1><p class="small meta">${t('in')}: <a href="${esc(L.cat(cat))}">${esc(cat.name)}</a> · ${t('published')}: ${time(tp.created)}</p>${tp.locked?`<p class="notice">${t('lockedNote')}</p>`:''}${paginationHtml(pg,pages,n=>href(topicPath(tp,n)))}${posts}${paginationHtml(pg,pages,n=>href(topicPath(tp,n)))}<p><a class="btn primary" href="${esc(href('/app/#/cevap/'+tp.id))}">${t('reply')}</a></p>${nav}`}))}
  sitemapTopics.push({loc:ABS(topicPath(tp)),lastmod:lastmodOf(tp)})}
// Eski slug yönlendirmeleri (meta refresh + canonical; sitemap'e girmez)
for(const r of full.redirects||[]){const tp=db.topics.find(x=>x.id===r.topicId);if(!tp||tp.slug===r.slug)continue;const to=ABS(topicPath(tp));
  W(`${r.slug}/${r.topicId}/index.html`,`<!doctype html><html lang="${S.lang||'tr'}"><head><meta charset="utf-8"><title>${esc(tp.title)}</title><link rel="canonical" href="${esc(to)}"><meta http-equiv="refresh" content="0;url=${esc(to)}"><meta name="robots" content="noindex,follow"></head><body><p><a href="${esc(to)}">${esc(tp.title)}</a></p></body></html>`)}
// 404
W('404.html',doc({title:`404 - ${S.siteName}`,desc:'Sayfa bulunamadı',p:'/404.html',robots:'noindex,follow',items:[homeItem,{name:'404'}],main:`<h1 class="ptitle">404 — Sayfa bulunamadı</h1><p>Aradığınız sayfa taşınmış veya silinmiş olabilir. <a href="${esc(K.home)}">Ana sayfaya dönün</a> veya aramayı kullanın.</p>`}));
// Sitemap
const xml=(tag,rows)=>`<?xml version="1.0" encoding="UTF-8"?>\n<${tag} xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}</${tag}>\n`;
const urlset=a=>xml('urlset',a.map(u=>`<url><loc>${esc(u.loc)}</loc>${u.lastmod?`<lastmod>${u.lastmod}</lastmod>`:''}</url>\n`).join(''));
const maxU=Math.min(S.sitemapMax||1000,50000),files=[{name:'sitemap-categories.xml',rows:sitemapCats}];
for(let i=0;i*maxU<sitemapTopics.length;i++)files.push({name:`sitemap-topics-${i+1}.xml`,rows:sitemapTopics.slice(i*maxU,(i+1)*maxU)});
for(const f of files)W(f.name,urlset(f.rows));
const idx=xml('sitemapindex',files.map(f=>`<sitemap><loc>${esc(ABS('/'+f.name))}</loc>${f.rows.map(r=>r.lastmod).filter(Boolean).sort().at(-1)?`<lastmod>${f.rows.map(r=>r.lastmod).filter(Boolean).sort().at(-1)}</lastmod>`:''}</sitemap>\n`).join(''));
W('sitemap.xml',idx);W('sitemap-index.xml',idx);
W('robots.txt',`User-agent: *\nAllow: /\nDisallow: ${BASE}/app/\n\nSitemap: ${ABS('/sitemap.xml')}\n`);
console.log(`Tamam: ${db.categories.length} kategori, ${db.topics.length} konu, ${db.replies.length} cevap → _site/ (şema ${SCHEMA})`);

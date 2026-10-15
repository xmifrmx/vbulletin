// ÖRNEK veri üretir (data/ klasörünün üzerine yazar). Gerçek forumunuzda çalıştırmayın.
import path from 'node:path';import {fileURLToPath} from 'node:url';
import {saveDb} from './lib/fsdata.mjs';import {applyAction} from '../assets/js/core/actions.js';import {SCHEMA} from '../assets/js/core/schema.js';
const DATA=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../data');
const db={schema:SCHEMA,settings:{schema:SCHEMA,siteName:'MiFRM',tagline:'Classic Forum Engine',siteUrl:'https://example.github.io/mifrm',lang:'tr',logoUrl:'',
  seoTitle:'',seoDescription:'MiFRM ile GitHub Pages üzerinde çalışan klasik forum.',maxCategoryDepth:3,repliesPerPage:10,topicsPerPage:20,sitemapMax:1000,
  rateLimitPerHour:5,maxLinks:5,spamWords:[],peertubeHosts:[],shared:{enabled:false,repo:''},counters:{topic:1,reply:1,category:1}},categories:[],topics:[],replies:[],redirects:[]};
const run=(a,p,at)=>{const r=applyAction(db,a,p,{admin:true,now:at});if(!r.ok)throw new Error(a+': '+r.error);return r};
run('saveCategory',{name:'Genel',description:'Genel tartışmalar ve duyurular',order:1},'2026-10-01T09:00:00Z');
run('saveCategory',{name:'Duyurular',description:'Forum duyuruları',parentId:1,order:1});
run('saveCategory',{name:'Teknoloji',description:'Yazılım, donanım ve yapay zekâ',order:2});
run('saveCategory',{name:'Yapay Zekâ',description:'Yapay zekâ üzerine konular',parentId:3,order:1});
run('newTopic',{title:"MiFRM Classic Forum'a hoş geldiniz",categoryId:2,author:'Yönetici',content:'<p>Bu bir <strong>örnek</strong> konudur. Yönetim bölümünden kategorileri düzenleyebilirsiniz.</p><h2>Neler var?</h2><ul><li>Klasik görünüm</li><li>JSON veri yapısı</li></ul>'},'2026-10-01T10:00:00Z');
run('pinTopic',{id:1,value:true});
run('newReply',{topicId:1,author:'Misafir',content:'<p>Teşekkürler, deneme cevabı.</p>'},'2026-10-02T08:30:00Z');
run('newTopic',{title:'Yapay zekâ hakkında ilk düşünceleriniz',categoryId:4,author:'Ayşe',content:'<p>Yapay zekâ araçlarını günlük işlerinizde kullanıyor musunuz?</p><blockquote><p>Önce ihtiyacı tanımlayın.</p></blockquote>'},'2026-10-03T12:00:00Z');
run('newReply',{topicId:2,author:'Mehmet',content:'<p>Evet, özellikle metin özetleme için.</p>'},'2026-10-03T13:10:00Z');
run('newReply',{topicId:2,author:'Zeynep',content:'<p>Kod yazarken yardımcı oluyor; çıktıyı yine de kontrol ediyorum.</p><pre><code>console.log("merhaba");</code></pre>'},'2026-10-04T09:45:00Z');
saveDb(DATA,db);console.log('Örnek veri yazıldı:',DATA);

// Video URL ayrıştırıcıları. Yalnızca doğrulanabilir kimlik + izinli gömme alanı üretir.
// Hiçbir başlık/izlenme/meta veri uydurulmaz. Tanınma ≠ oynatılabilirlik.
import {esc} from './util.js';
const IFRAME_HOSTS=new Set(['www.youtube-nocookie.com','player.vimeo.com','www.dailymotion.com','player.twitch.tv','clips.twitch.tv','www.tiktok.com','www.facebook.com','www.instagram.com']);
export function embedAllowed(src,ctx={}){try{const x=new URL(src);return x.protocol==='https:'&&(IFRAME_HOSTS.has(x.hostname)||(ctx.peertubeHosts||[]).includes(x.hostname))}catch{return false}}
const toUrl=raw=>{try{const x=new URL(String(raw).trim());return /^https?:$/.test(x.protocol)&&!x.username&&!x.password?x:null}catch{return null}};
const hostOf=x=>x.hostname.toLowerCase().replace(/^(www|m)\./,'');
const segs=x=>x.pathname.split('/').filter(Boolean);
const mk=(provider,id,src,url,o={})=>({provider,id,kind:'iframe',ratio:'16:9',src,url,...o});

export function parseYouTubeUrl(raw){const x=toUrl(raw);if(!x)return null;const h=hostOf(x),p=segs(x);let id=null,short=false;
  if(h==='youtu.be')id=p[0];
  else if(['youtube.com','music.youtube.com','youtube-nocookie.com'].includes(h)){
    if(p[0]==='watch')id=x.searchParams.get('v');
    else if(['shorts','embed','live','v'].includes(p[0])){id=p[1];short=p[0]==='shorts'}}
  if(!id||!/^[\w-]{11}$/.test(id))return null;
  const st=parseInt(x.searchParams.get('t')||x.searchParams.get('start')||'',10);
  return mk('youtube',id,`https://www.youtube-nocookie.com/embed/${id}${st>0?`?start=${st}`:''}`,x.href,{ratio:short?'9:16':'16:9'})}
export function parseVimeoUrl(raw){const x=toUrl(raw);if(!x)return null;const h=hostOf(x),p=segs(x);if(h!=='vimeo.com'&&h!=='player.vimeo.com')return null;
  const i=p.findIndex(s=>/^\d{5,}$/.test(s));if(i<0)return null;const id=p[i],hash=/^[0-9a-f]{6,}$/i.test(p[i+1]||'')?p[i+1]:null;
  return mk('vimeo',id,`https://player.vimeo.com/video/${id}${hash?`?h=${hash}`:''}`,x.href)}
export function parseDailymotionUrl(raw){const x=toUrl(raw);if(!x)return null;const h=hostOf(x),p=segs(x);let id=null;
  if(h==='dai.ly')id=p[0];else if(h==='dailymotion.com'&&p[0]==='video')id=p[1];
  if(!id||!/^[a-z0-9]{5,}$/i.test(id))return null;return mk('dailymotion',id,`https://www.dailymotion.com/embed/video/${id}`,x.href)}
export function parseTwitchUrl(raw,ctx={}){const x=toUrl(raw);if(!x)return null;const h=hostOf(x),p=segs(x);let q=null,id=null,kind='';
  if(h==='twitch.tv'){if(p[0]==='videos'&&/^\d+$/.test(p[1]||'')){id=p[1];kind='v'}else if(p[1]==='clip'&&p[2]){id=p[2];kind='c'}else if(p[0]&&/^\w{3,25}$/.test(p[0])&&!p[1]){id=p[0];kind='ch'}}
  else if(h==='clips.twitch.tv'&&p[0]){id=p[0];kind='c'}
  if(!id||!/^[\w-]+$/.test(id))return null;
  if(!ctx.parent||!/^[\w.-]+$/.test(ctx.parent))return {provider:'twitch',id,kind:'link',url:x.href};
  const par=encodeURIComponent(ctx.parent);
  const src=kind==='v'?`https://player.twitch.tv/?video=v${id}&parent=${par}&autoplay=false`:kind==='ch'?`https://player.twitch.tv/?channel=${id}&parent=${par}&autoplay=false`:`https://clips.twitch.tv/embed?clip=${id}&parent=${par}&autoplay=false`;
  return mk('twitch',id,src,x.href)}
export function parseTikTokUrl(raw){const x=toUrl(raw);if(!x)return null;const h=hostOf(x),p=segs(x);if(h!=='tiktok.com')return null;
  const i=p.indexOf('video');if(i<0||!/^\d{8,25}$/.test(p[i+1]||''))return null;return mk('tiktok',p[i+1],`https://www.tiktok.com/embed/v2/${p[i+1]}`,x.href,{ratio:'9:16'})}
export function parseFacebookUrl(raw){const x=toUrl(raw);if(!x)return null;const h=hostOf(x);if(h==='fb.watch')return {provider:'facebook',id:segs(x)[0]||'',kind:'link',url:x.href};
  if(h!=='facebook.com')return null;const p=segs(x);if(!(p.includes('videos')||p[0]==='watch'||p[0]==='reel'||p[0]==='video.php'))return null;
  return mk('facebook',x.pathname,`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(x.origin+x.pathname+(p[0]==='watch'||p[0]==='video.php'?x.search:''))}&show_text=false`,x.href,{ratio:p[0]==='reel'?'9:16':'16:9'})}
export function parseInstagramUrl(raw){const x=toUrl(raw);if(!x)return null;if(hostOf(x)!=='instagram.com')return null;const p=segs(x);
  const i=p.findIndex(s=>['reel','reels','p','tv'].includes(s));if(i<0||!/^[\w-]{5,}$/.test(p[i+1]||''))return null;const type=p[i]==='reels'?'reel':p[i];
  return mk('instagram',p[i+1],`https://www.instagram.com/${type}/${p[i+1]}/embed`,x.href,{ratio:type==='reel'?'9:16':'16:9'})}
export function parseXUrl(raw){const x=toUrl(raw);if(!x)return null;if(!['x.com','twitter.com'].includes(hostOf(x)))return null;const p=segs(x);
  return p[1]==='status'&&/^\d+$/.test(p[2]||'')?{provider:'x',id:p[2],kind:'link',url:x.href}:null} // iframe ile gömülemez: yalnızca bağlantı
export function parsePeerTubeUrl(raw,ctx={}){const x=toUrl(raw);if(!x||!(ctx.peertubeHosts||[]).includes(x.hostname))return null;const p=segs(x);
  const id=p[0]==='w'?p[1]:p[0]==='videos'&&p[1]==='watch'?p[2]:null;if(!id||!/^[\w-]{6,}$/.test(id))return null;return mk('peertube',id,`https://${x.hostname}/videos/embed/${id}`,x.href)}
const MIME={mp4:'video/mp4',m4v:'video/mp4',webm:'video/webm',ogg:'video/ogg',ogv:'video/ogg'};
export function parseDirectVideoUrl(raw){const x=toUrl(raw);if(!x)return null;const m=/\.(mp4|m4v|webm|ogg|ogv)$/i.exec(x.pathname);if(!m)return null;
  return {provider:'direct',id:x.pathname,kind:x.protocol==='https:'?'video':'link',src:x.href,mime:MIME[m[1].toLowerCase()],ratio:'16:9',url:x.href}}
const PARSERS=[parseDirectVideoUrl,parseYouTubeUrl,parseVimeoUrl,parseDailymotionUrl,parseTwitchUrl,parseTikTokUrl,parseFacebookUrl,parseInstagramUrl,parseXUrl,parsePeerTubeUrl];
export function parseVideoUrl(raw,ctx={}){const x=toUrl(raw);if(!x)return null;
  for(const p of PARSERS){const v=p(raw,ctx);if(v){if(v.kind==='iframe'&&!embedAllowed(v.src,ctx))return {...v,kind:'link'};return v}}
  return {provider:'unknown',kind:'link',url:x.href}}
export function embedHtml(v){if(!v)return '';
  const link=`<a href="${esc(v.url)}" rel="nofollow ugc noopener noreferrer" target="_blank">Videoyu kaynağında aç</a>`;
  if(v.kind==='iframe')return `<figure class="video"><div class="video-box ${v.ratio==='9:16'?'r916':'r169'}"><iframe src="${esc(v.src)}" title="Video (${esc(v.provider)})" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"></iframe></div><figcaption class="small">${link}</figcaption></figure>`;
  if(v.kind==='video')return `<figure class="video"><video controls preload="metadata" playsinline src="${esc(v.src)}"></video><figcaption class="small">${link}</figcaption></figure>`;
  return `<p class="video-link"><a href="${esc(v.url)}" rel="nofollow ugc noopener noreferrer" target="_blank">Video bağlantısı (${esc(v.provider)})</a> <span class="small">— sayfaya gömülemiyor, dış bağlantı olarak açılır.</span></p>`}

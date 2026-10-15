# MiFRM Classic Forum Engine

vBulletin 3.6 tarzı klasik görünümlü, **GitHub Pages üzerinde çalışan**, derleme gerektirmeyen (HTML5 + CSS + Vanilla JS + JSON) forum motoru. Site adı, logo ve SEO ayarları `data/settings.txt` içinde (veya Yönetim ekranında) değiştirilir.

> `data/` içindeki içerik **örnek veridir** (`node tools/seed.mjs` ile üretilir). Kendi forumunuzda silin/düzenleyin.

## Mimarinin sınırları (sade dille)

GitHub Pages yalnızca **dosya sunar**; tarayıcıdan depoya doğrudan yazılamaz. Bu yüzden iki mod vardır:

| | **Yerel mod** (varsayılan) | **Ortak mod** (isteğe bağlı) |
|---|---|---|
| Veri nerede? | Yalnızca ziyaretçinin tarayıcısı (localStorage) | `data/*.txt` (GitHub deposu) |
| Başkaları görür mü? | **Hayır** | Evet, yayınlandıktan sonra |
| Yazma | Anında | Önceden doldurulmuş GitHub issue → Actions doğrular → commit → Pages yeniden yayınlanır (dakikalar sürer) |
| Gereken | Hiçbir şey | GitHub hesabı (gönderen için), Actions açık |
| Yönetici yetkisi | **Yok** (panel yalnızca yerel veriyi değiştirir) | Gerçek: yalnızca depo sahibi/ortakların issue'ları (`author_association`) |

Dürüst notlar:
- Yönetim ekranının görünmesi yetki demek **değildir**. Gizli URL, localStorage bayrağı veya tarayıcıda saklanan şifre güvenlik sağlamaz; bu projede bunlar kullanılmaz.
- GitHub token'ı hiçbir istemci dosyasında bulunmaz. Ortak mod, tarayıcıdan token ile API çağırmaz; kullanıcı kendi hesabıyla issue açar.
- Ortak modda kullanıcı adı **doğrulanmaz** (herkes istediği adı yazabilir). E-posta ortak moda **hiç gönderilmez**; yerelde de yalnızca tarayıcıda kalır, HTML/JSON/JSON-LD/yedek çıktısına girmez. "Gerçek e-posta doğrulaması" ve üyelik/parola sistemi sunucusuz mümkün olmadığından yoktur.
- `data/ratelimit.txt` (hız sınırı için) gönderen GitHub kullanıcı adlarını depoda tutar; herkese açık depoda bunun gizlilik etkisini göz önünde bulundurun. Yayına kopyalanmaz.
- Gönderi başına GitHub bağlantı uzunluk sınırı (~7500 karakter) nedeniyle çok uzun içerikler ortak modda gönderilemez.
- Görsel/video yalnızca **URL** ile eklenir. Dosya yükleme yoktur. Harici içeriğin kalıcılığı ve izleme/gizlilik davranışı üçüncü tarafa aittir.
- Yerel modda her kullanıcı yalnızca kendi verisini görür; siteye "ortak içerik" gibi sunulmaz.
- Statik sayfalar yalnızca **yayın sırasında** (`node tools/build.mjs`) üretilir; tarayıcı yeni konu açınca sitemap/HTML kendiliğinden güncellenmez.

## Kurulum

1. Depoyu GitHub'a yükleyin (`main` dalı). **Settings → Pages → Source: GitHub Actions.**
2. `data/settings.txt` içinde `siteUrl` değerini gerçek adresinizle değiştirin (örn. `https://kullanici.github.io/depo`). Canonical, sitemap ve JSON-LD buna bağlıdır.
3. Push edince `pages` iş akışı test → build → denetim → yayın yapar.
4. Yerelde: `npm run all` (Node ≥ 20), arayüz için `npm run serve` → `http://localhost:8080/app/`.

### Ortak modu açmak
1. `data/settings.txt` → `"shared": {"enabled": true, "repo": "kullanici/depo"}`.
2. Actions izinleri: Settings → Actions → General → *Read and write permissions*.
3. `main` dalında doğrudan push'u engelleyen dal koruması varsa bot için istisna tanımlayın.
4. Arayüzde *Hakkında ve Mod* sayfasından Ortak moda geçin. `ingest` iş akışı `[mifrm]` başlıklı issue'ları işler: boyut sınırı, saatlik hız sınırı (`rateLimitPerHour`), bağlantı sayısı (`maxLinks`), `spamWords`, yinelenen içerik denetimi, veri bütünlüğü doğrulaması ve çakışma denetimi (`expectUpdated`); iş akışları `concurrency` ile sıraya dizilir. Etkin değilse arayüz özelliği açıkça devre dışı gösterir.

### Yerel içeriği depoya taşımak
Yönetim → *Veri klasörü paketi* → `node tools/unpack.mjs mifrm-data-files.json` (doğrular, `data/` yazar) → commit.

## Yapı

```
app/index.html        etkileşimli SPA kabuğu (noindex)
assets/css/forum.css  tek tasarım sistemi, --wrap ile genişlik
assets/js/core/       DOM'suz ortak modüller (tarayıcı + Node aynı kodu kullanır)
  sanitize.js video.js actions.js schema.js files.js views.js layout.js icons.js i18n.js util.js
assets/js/{app,editor,store,ui}.js
data/                 settings.txt, categories.txt, index.txt, redirects.txt, topics/N.txt, replies/N.txt
tools/                build, check, test, seed, ingest, unpack
.github/workflows/    pages.yml, ingest.yml
docs/TEST_PLAN.md
```

## URL, SEO ve sitemap
- Konu: `/slug/ID/` (sayfalar: `/slug/ID/sayfa/2/`), kategori: `/kategori/ust/alt/`. Kimlik kalıcıdır; başlık değişince eski slug'lar için `meta refresh` + canonical sayfalar üretilir (GitHub Pages sunucu yönlendirmesi yapamaz; bu 301 değildir).
- Her sayfa: benzersiz title/description, canonical, robots, Open Graph, breadcrumb, tek H1, JSON-LD (`WebSite`, `Organization`, `BreadcrumbList`, `CollectionPage`, `DiscussionForumPosting` + yalnızca sayfada görünen cevaplar `Comment` olarak). Alanlar gerçek veriden gelir; JSON-LD `JSON.stringify` + `<` kaçışıyla üretilir. Google'ın zengin sonuç göstermesi garanti edilmez.
- `sitemap.xml` (indeks), `sitemap-index.xml`, `sitemap-categories.xml`, `sitemap-topics-N.xml`, `robots.txt`. Yalnızca canonical, yayımlanmış sayfa-1 URL'leri; `lastmod` gerçek düzenleme/cevap tarihinden (W3C biçimi). Silinen konu = 404 (statik barındırma 410 veremez).
- Kategori derinliği `maxCategoryDepth` ile sınırlıdır; döngü ve yinelenen slug engellenir.
- JS çalışmadan: yayımlanmış içerik statik HTML'dir. Yerel moddaki SPA içeriği indekslenmez ve indekslenmesi amaçlanmaz.

## Güvenlik özeti
Allowlist temizleyici (`script/iframe/object/embed`, olay nitelikleri, `javascript:`/`data:` vb. reddedilir), video iframe'leri yalnızca sağlayıcı allowlist'inden ve yalnızca kodun ürettiği adreslerle, kullanıcı iframe HTML'i asla çalıştırılmaz. Kullanıcı içeriği JSON-LD'ye ham eklenmez. `tools/test.mjs` XSS vektörlerini sınar.

## Bilinen sınırlar
- Editör `contenteditable` + `document.execCommand` kullanır (kullanımdan kalkmış olsa da tüm tarayıcılarda çalışır); görünüm tarayıcılar arası küçük farklar gösterebilir.
- İkonlar Lucide geometrisinde satır içi SVG'dir; yollar elle yerleştirildi (docs/ICONS.md). Çalışma harici CDN'ye bağlı değildir.
- Tüm veriler açılışta yüklenir (konu başına bir dosya); binlerce konuda arayüz yavaşlar, bu ölçek için sunucu/DB gerekir.
- Yazar profili sayfası yoktur (hesap sistemi olmadığı için). Dil altyapısı vardır (`assets/js/lang/`), ancak yönetim/form metinlerinin bir kısmı henüz Türkçe sabittir.
- Lighthouse vb. skorlar **ölçülmedi**; hiçbir skor iddia edilmez. Test planı: `docs/TEST_PLAN.md`.
- Twitch gömmesi için `parent` alan adı gerekir; X (Twitter) videoları yalnızca bağlantı olarak gösterilir; TikTok/Facebook/Instagram gömmeleri platform politikalarına bağlıdır ve çalışmayabilir.

## Veri biçimi: `data/*.txt` (herkese açık)
Tüm forum verisi `data/` klasöründe **düz metin (.txt) dosyaları** olarak durur: `settings.txt`, `categories.txt`, `index.txt`, `redirects.txt`, `topics/ID.txt`, `replies/ID.txt`. Dosyaların içeriği UTF-8 **JSON metnidir** (şema sürümlü, Türkçe karakterler korunur); böylece doğrulama, yedekleme ve çakışma denetimi çalışmaya devam eder. Yayımlanan siteden `https://SITE/data/topics/1.txt` gibi adreslerle herkes okuyabilir (GitHub Pages `text/plain` olarak sunar).
- **Herkese açık demektir:** konu/cevap metni, yazar adları ve tarihler dahil her şey kamuya açıktır. Bu yüzden **e-posta adresleri bu dosyalara hiç yazılmaz** (yalnızca yerel tarayıcıda kalır); yazmak kişisel veriyi herkese açık depoda yayımlamak olurdu.
- `data/ratelimit.txt` (hız sınırı için GitHub kullanıcı adları) depoda durur ama yayına kopyalanmaz.
- Eski `.json` dosyaları artık okunmaz; varsa `node tools/seed.mjs` ile örnek veriyi yeniden üretin veya dosyaları `.txt` olarak yeniden adlandırın.

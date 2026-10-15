# Test planı

Otomatik (depoda): `npm run all` → `tools/test.mjs` (slug, XSS, video ayrıştırıcıları, eylemler, şema), `tools/build.mjs` (veri doğrulama), `tools/check.mjs` (kırık iç bağlantı, canonical↔sitemap eşleşmesi, yinelenen URL, `lastmod` biçimi, sayfa başına tek H1, title/description, JSON-LD'nin JSON olarak geçerliliği).

Yayın sonrası elle (araçlar dış servislerdir; sonuçları kendiniz ölçün):
| Kontrol | Araç | Beklenen |
|---|---|---|
| HTML | validator.w3.org | Hata yok (örnek sayfalar: `/`, kategori, konu, 404) |
| CSS | jigsaw.w3.org/css-validator | Hata yok |
| Performans/Erişilebilirlik/SEO | Lighthouse, PageSpeed Insights | Ölçüp kaydedin; skor iddia etmeyin |
| Yapılandırılmış veri | search.google.com/test/rich-results, validator.schema.org | `DiscussionForumPosting`, `BreadcrumbList` hatasız |
| Sitemap | Search Console → Sitemaps, `xmllint --noout` | Okundu, URL sayısı eşleşir |
| URL denetimi | Search Console URL Inspection | Canonical = kullanıcı seçtiği |
| Mobil | Gerçek cihaz 320/390/768/1024 px | Yatay kaydırma yok, dokunma hedefleri ≥44px |
| Klavye | Tab/Shift+Tab/Enter/Esc | Tüm işlevler erişilebilir, odak görünür, diyaloglar Esc ile kapanır |
| Ekran okuyucu | NVDA/VoiceOver | Araç çubuğu, form hataları (`role=alert`), sayfalama anlamlı okunur |
| Konsol | DevTools | Hata yok |
| 404 | Var olmayan URL aç | `404.html` gösterilir |
| Ortak mod | Test issue'su aç (`[mifrm] newReply`) | Yanıt, commit ve yeniden yayın; hız sınırı 6. gönderide reddeder |

Hata bulunursa dosya/satır ile bir issue açıp düzeltin; `npm run all` tekrar çalıştırılmalıdır.

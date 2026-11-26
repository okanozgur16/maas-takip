# CLAUDE.md — ShiftPay %100 Web Tabanlı Geliştirme Rehberi (Claude Pro / Claude Code Web & Antigravity)

> **Aktif Sürüm:** `2026-11-26-shiftpay-v87`  
> **Canlı PWA (Cloudflare Pages):** `https://shiftpay-app.pages.dev/`  
> **Canlı API & Push Sunucusu (Cloudflare Worker):** `https://summer-mode-6176.okan-counter.workers.dev`  
> **Canlı Şifreli Eşitleme Veritabanı (Firebase Firestore):** `maas-takip-sync` (`firestore.rules` + `firebase.json` + `.firebaserc`)  
> **Tek Doğru Kaynak (GitHub):** `https://github.com/okanozgur16/maas-takip` (`main` dalı)

Bu depo **%100 bulut/web tabanlı** çalışacak şekilde yapılandırılmıştır. Yerel bilgisayardaki hiçbir klasöre erişim gerekmez: tüm önyüz (`index.html`, `sw.js`), sunucu (`server/bildirim-worker.js`), otomasyon botları (`automation/*.py`) ve otomatik yayın hattı (`.github/workflows/deploy-cloudflare.yml`) doğrudan bu GitHub deposundadır.

---

## 1. Hızlı İş Akışı ("Yaz -> Sormadan Tak Tak Canlıya Al ve Gözünle Doğrula")

0. **ALTIN KURAL — ONAY BEKLEME, DOĞRUDAN YAYINLA:** Kullanıcı (özellikle işteyken telefonundan) bir özellik, tasarım, düzeltme veya ayar istediğinde **"Yayınlayayım mı?" diye sorma!** Tıpkı Antigravity gibi doğrudan kodu düzenle, 6 dosyada sürümü artır, `main` dalına gönder (`github_edit_and_push` veya `git push`), ~30 saniye bekleyip `github_ci_status` ile yayını doğrula ve `live_site_visual_check` (`desktop` + `mobile`) ile canlı sayfayı **kendi gözünle** kontrol edip bitmiş sonucu raporla.
1. **7/24 Aktif Bulut Araçların (`ShiftPay Tam Yetki` Uzak MCP Bağlayıcısı):**
   - Bilgisayar kapalıyken bile telefondaki normal sohbetten şu araçlara tam yetkin vardır:
     - `live_site_visual_check`: Canlı `https://shiftpay-app.pages.dev/` sitesini gerçek Chromium'da açıp masaüstü (`1280x820`) ve telefon (`390x844`) PNG ekran görüntüsünü doğrudan gözünün önüne getirir.
     - `github_read_file`, `github_search_code`, `github_edit_and_push`, `github_ci_status`: Yerel bilgisayar olmadan `okanozgur16/maas-takip` (`main`) üzerinde satır okuma, arama, çoklu dosya atomik commit/push ve Actions kontrolü yapar.
     - `cloudflare_manage`: `summer-mode-6176` (veya `shiftpay-mcp`) üzerindeki tüm gizli anahtarları (`OWNER_TOKEN`, `VAPID_PUBLIC`, `VAPID_PRIVATE`, `VAPID_SUBJECT`), Cron zamanlayıcısını (`get_schedules` / `set_schedules`) ve KV veritabanını yönetir.
     - `firebase_manage`: `maas-takip-sync` projesinde hem `firestore.rules` okuma/yayınlama hem de Firestore belgelerini (`get_doc`, `list_docs`, `delete_doc`) yönetici yetkisiyle okuma/silme işlemi yapar.
2. **Önce Oku:** Her görev başında `AI-HANDOFF.md` (en üstteki son kayıtlar) ve `AI-CONTEXT.md` dosyalarını oku.
2. **Doğrudan `main` Dalında Güncelle & Otomatik Yayınla:**
   - Bu depoda `main` dalına commit/push yapıldığında `.github/workflows/deploy-cloudflare.yml` **~30 saniye içinde otomatik olarak**:
     1. **Pre-Deploy Safety Guard** çalıştırır (`node --check` V8 sözdizimi, `calcPay()` maaş matematiği testi, sürüm senkronizasyonu, tekrarlı HTML ID kontrolü, `I18N_EN` Türkçe karakter sızıntı testi ve gizli anahtar taraması).
     2. **Cloudflare Pages (`shiftpay-app`)** önyüzünü canlıya alır (`https://shiftpay-app.pages.dev/`).
     3. **Cloudflare Worker (`summer-mode-6176`)** sunucusunu `server/bildirim-worker.js` dosyasından **otomatik günceller** (`keep_bindings` ile mevcut `OWNER_TOKEN`, `VAPID_*` secret'larını ve `KV` veritabanını %100 korur).
     4. **Firebase Firestore (`maas-takip-sync`)** güvenlik kurallarını `firestore.rules` dosyasından derleyip doğrular (`:test`) ve değişiklik varsa **otomatik canlıya yayınlar** (`FIREBASE_SERVICE_ACCOUNT`).
     4. **Post-Deploy Smoke Test** ile canlı `https://shiftpay-app.pages.dev/version.json` sürümünü doğrular.
3. **Zorunlu Sürüm Eşitleme (7 Dosya):**
   - Kod değiştiğinde şu dosyaların sürüm etiketini aynı anda bir artır (`YYYY-MM-DD-shiftpay-vXX`):
     1. `index.html` (`var APP_VER = '...'`)
     2. `version.json` (`{"v": "..."}`)
     3. `sw.js` (`const CACHE = 'maas-takip-v1-...'`)
     4. `README.md`
     5. `CLAUDE.md`
     6. `AI-CONTEXT.md`
     7. `AI-HANDOFF.md` (en üste yeni sürüm özeti ekle)

---

## 2. Depo Klasör ve Dosya Haritası

| Yol | Açıklama |
|---|---|
| `index.html` | Tek dosya PWA uygulaması (HTML + CSS + JS, ~5.850 satır). Windows 11 Fluent Mica sol menü (`❖ MENÜ`), maaş/vergi motoru, PDF bordro okuyucu, Planbition, şifreli Firestore eşitleme, Birikim & Hedef halkası, canlı döviz (`EUR/USD/GBP -> TRY`). |
| `sw.js` | Çevrimdışı PWA önbellekleme ve Web Push bildirim tıklama yöneticisi. |
| `version.json` | İstemci otomatik güncelleme yoklama dosyası (`?v=` cache-buster tetikler). |
| `server/bildirim-worker.js` | Canlı Cloudflare Worker (`summer-mode-6176`) tam kaynak kodu: Web Push (`/api/sync`, `/api/off`, `/api/test`), canlı Planbition proxy (`/api/planbition`), canlı myHolland PDF bordro çekici (`/api/myholland-slips`) ve saatlik Cron bildirimleri. |
| `firestore.rules`, `firebase.json`, `.firebaserc` | Canlı Firebase Firestore (`maas-takip-sync`) güvenlik kuralları. `/sync/{id}` üzerinde 64-hex SHA-256 belge adı, `['c','u','v']` şema doğrulaması ve iptal edilen kodun (`c == ""`) yeniden kullanımını kalıcı engelleyen kural seti. |
| `automation/` | Arka plan Python botları (`run_sync.py`, `planbition_bot.py`, `myholland_bot.py`, `gmail_bot.py`, `pdf_parser.py`, `sync_engine.py`, `daemon.py`, `config.example.env`). Sadece kaynak koddur; `dist/` içine kopyalanmaz. |
| `.github/workflows/deploy-cloudflare.yml` | Otomatik test + Cloudflare Pages + Cloudflare Worker CI/CD iş akışı. |
| `_headers`, `_redirects`, `manifest.webmanifest`, `fonts/`, `lib/` | Güvenlik başlıkları, SPA yönlendirmesi, PWA manifestosu, yerel fontlar ve yerel `pdf.js` (`3.11.174`). |

---

## 3. Kritik Kurallar & CI Kırmızı Çizgileri

1. **İngilizce Çeviri (`I18N_EN`) Kuralı (CI Kırıcı!):**
   - `index.html` içindeki `var I18N_EN = {...};` nesnesinin **değerlerinde (sağ tarafta)** tek bir Türkçe karakter (`ğ, ş, ı, İ, ö, ü, ç, Ğ, Ş, Ö, Ü, Ç`) bile bulunursa GitHub Actions yayını reddeder. Yeni metinlerde `L('Türkçe metin', 'English text')` kullan veya `I18N_EN` içine saf İngilizce karşılık ekle.
2. **Gizlilik & Güvenlik:**
   - Ham eşitleme kodu, e-posta, şifre, `OWNER_TOKEN` (`sp_...`) veya API anahtarı **ASLA** koda ya da dokümanlara yazılmaz.
   - Sahibe özel özellikler (`mhAutoPull`, `copyAiCtx`, owner Planbition push) istemcide çift SHA-256 `OWNER_HASH` (`isOwner()`) ve sunucuda sabit zamanlı `env.OWNER_TOKEN` ile korunur.
3. **Korunan Yedek Dallar (Asla Silme / Force-Push Yapma):**
   - `backup-pre-v19`, `backup-v40`, `backup-v50-with-pc`, `backup-v58`.
4. **Hesaplama ve Veri Bütünlüğü:**
   - `calcPay()`, `taxNormal()`, `weekResult()`, `parkOf()`, `mergeStates()` (bordro `slip.u` zaman damgası ve `state.del` tombstone koruması) ve `ugAvgPayInfo()` (otopark hariç + özel kira/sigorta düşülmüş net maaş ortalaması) mantığını bozma.
   - Açık/Koyu tema (`data-theme="light"|"dark"`), Kategori/Sıralamalı görünüm (`UI_VER`) ve Masaüstü (`>=960px` sol menü) / Mobil (`390px` 3 sütunlu sekme barı) uyumunu koru.

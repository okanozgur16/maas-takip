# ShiftPay · Teknik Mimari & Geliştirici Bağlamı (`AI-CONTEXT.md`)

- **Aktif Sürüm:** `2026-11-23-shiftpay-v57`
- **Canlı Uygulama:** `https://shiftpay-app.pages.dev/`
- **GitHub Kaynak Deposu:** `https://github.com/okanozgur16/maas-takip` (`main` dalı)
- **Cloudflare Worker:** `https://summer-mode-6176.okan-counter.workers.dev` (`server/bildirim-worker.js`)

## Kapsam (`v51`+)
ShiftPay %100 saf **Vardiya, Bordro ve Maaş Takibi** PWA uygulamasıdır. Tüm eski PC Planı, PC kasası (`VAULT`), fiyat/stok takibi (`watch.json`, `watch.enc.json`, `/api/pc-watch`, `/api/pc-notify`, `bildirim.yml`) kodları ve dosyaları tamamen kaldırılmıştır.

## Temel Mimari
1. **Tek Dosya PWA (`index.html` + `sw.js` + `version.json` + `_headers`):**
   - Hollanda uitzendbureau maaş motoru (`calcPay`, `taxNormal`, `classifyShift`, `weekResult`): %100/%150/%185 saatler, ADV, tatil parası, StiPP, PAWW/AZV/WIA/WHK, ET-regeling konut/sigorta, tatil aralığı (`vacTo`) ve bordro kalibrasyonu (`autoFromSlips`).
   - İstemci tarafı PDF bordro ayrıştırıcı (`lib/pdf.min.js`) + doğruluk rehberi & ayar kontrol listesi (`accuracyHtml`, `chkItems`).
   - Planbition canlı vardiya entegrasyonu (`weeksOk` korumalı, `pbRetire` tombstone'lu, AES-256-GCM cihaz anahtarlı şifre saklama).
   - İsteğe bağlı Firebase Firestore AES-256-GCM uçtan uca şifreli cihazlar arası eşitleme (`sync*`, `mergeStates`).
   - Kişisel genel birikim hedefi (`💰 Birikimim & Hedefim` — `renderSavGoal`, herkese açık).
   - Sahibe özel (`isOwner()` çift SHA-256 `OWNER_HASH` + `env.OWNER_TOKEN`): tek tık myHolland/Mail bordro çekici (`mhAutoPull`), AI devam köprüsü (`copyAiCtx`) ve sahip Planbition push bildirimleri.
2. **Cloudflare Worker (`server/bildirim-worker.js`):**
   - Web Push VAPID (`/api/sync`, `/api/off`, `/api/test`): `Origin` doğrulaması, IP hız sınırı (`30/dk`), vardiya hatırlatmaları, tatil bitişi bildirimi (`ve`) ve sahibe özel (`u.own === 1`) Planbition değişikliği/onay bildirimi.
   - `/api/planbition` ve `/api/myholland-slips`: sabit zamanlı `env.OWNER_TOKEN` doğrulaması.
3. **Otomatik CI/CD (`.github/workflows/deploy-cloudflare.yml`):**
   - Pre-Deploy: V8 sözdizimi, `calcPay()` regresyon testi, sürüm uyumu, tekrarlı ID, `I18N_EN` JSON + TR sızıntı kontrolü ve gizli anahtar taraması.
   - Temiz `dist/` → Cloudflare Pages yayını → Post-Deploy canlı `version.json` smoke test.

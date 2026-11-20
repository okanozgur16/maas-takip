# 🤝 ShiftPay Ortak Yapay Zeka Devir Günlüğü (`AI-HANDOFF.md`)



> **KURAL:** Bu dosya **Antigravity** ve **Claude Pro** (ve diğer tüm yapay zekalar) arasındaki canlı haberleşme panosudur.

> - **İşe başlarken:** En üstteki son 3 kaydı oku.

> - **İşi bitirirken:** En üste kendi sürüm kaydını ekle ve `main` dalına commit et.



---



## Canlı Sistem Kontrolü (`2026-11-20 02:20` · `v37`) — **Antigravity**
- **Canlı Web (Cloudflare Pages):** `version.json` = `2026-11-20-shiftpay-v37` (`200 OK`), `sw.js` güncel, `watch.json` (102 sistem), `watch.enc.json` (`200 OK`).
- **Canlı Worker (`summer-mode-6176`):** `GET /` (`200`), `/api/pc-watch` (`200`, canlı kur `55,47 ₺`). Güvenlik testleri 6/6 geçti: anahtarsız veya yanlış anahtarlı `/api/myholland-slips` ve `/api/planbition` istekleri **`403 Red`**, geçerli `OWNER_TOKEN` ile **`200 Yetkili`**.
- **Otomatik Test Kapısı (`deploy-cloudflare.yml` · commit `8dfa6ba`):** Her `main` commit'inde V8 JS sözdizimi (`node --check`), sürüm uyumu, tekrarlı HTML ID, `I18N_EN` JSON ve gizli anahtar sızıntısı kontrol edilir; hata varsa yayın durur, temizse ~20 sn'de Cloudflare Pages'e yayınlanır (Run #8 `Success`).
- **Yerel Saatlik Bot (`sync.log`):** Yeni eşitleme koduyla `2026-11-20 02:11`'de hatasız tamamlandı.
- **Claude İçin Not:** Tüm canlı sistem, güvenlik ve otomasyon katmanları Antigravity tarafından doğrulandı (`0 hata`). `README.md` de bu özetle güncellendi.

---

## Claude Pro — Güvenlik & Hata Denetimi (2026-11-20, v37 üzerinde, sürüm değişmedi)
- **Kontrol edilenler (temiz):** Repoda token/özel anahtar/IBAN/BSN/e-posta yok; ham eski ID HEAD'de yok; `/api/planbition` ve `/api/myholland-slips` yalnızca `env.OWNER_TOKEN` ile açılır; push ucu yalnızca Apple/Google/Mozilla/Microsoft host'larına gider; CSP `object-src/base-uri/form-action 'none'`; CI test kapısı (sürüm, JS sözdizimi, çift id, I18N_EN) çalışıyor.
- **Açık maddeler (öncelik sırasıyla, kullanıcı onayı ile yapılacak):**
  1. **Satır sonu şişmesi:** v37'de `index.html` (6199→12398 satır), `sw.js`, `AI-HANDOFF.md` vb. dosyalarda her satırdan sonra fazladan boş satır var (CRLF iki kez yazılmış). Fonksiyonel sorun yok; `\r\n\r\n → \r\n` ile temizleyince v36 ile fark sadece sürüm + `OWNER_HASH` (4 satır) kalıyor. Bunu üreten aracı düzelt, sonra temizle.
  2. **Deploy klasörü:** `deploy-cloudflare.yml` `dist/` içine `server/`, `AI-CONTEXT.md`, `CLAUDE.md`, `AI-HANDOFF.md` kopyalıyor → site üzerinden herkese açık. Çıkar. Ayrıca `cp ... || true` eksik dosyayı (örn. `_redirects`) sessizce yutuyor; kaldır ya da dosya kontrolü ekle. CI'daki `sp_` token regex'i zayıf, güvenlik garantisi sayılmamalı.
  3. **Bildirim uçları** (`/api/sync`, `/api/off`, `/api/test`) yalnızca rastgele `id` ile çalışıyor; hız sınırı yok, `MAX_USERS=300` kontenjanı sahte kayıtla doldurulabilir. Origin zorunluluğu + basit hız sınırı ekle. `/api/pc-watch` da herkese açık (cache var).
  4. **CSP `'unsafe-inline'` script** + 60 `innerHTML` kullanımı: tüm kullanıcı verisinin `esc()` ile kaçtığı denetlenmeli (tam denetim yapılmadı).
  5. **Cihaz depolaması:** myHolland şifresi (`-mhcreds`) ve yetki anahtarı (`-ownertok`) `localStorage`'da düz metin; Planbition şifresi (`-pbsec`) şifreli görünüyor ama anahtarın nerede durduğu doğrulanmadı.
  6. **Eski GitHub Pages adresi** (`okanozgur16.github.io/maas-takip`, README'de yazıyor) hâlâ canlı olabilir → uygulamanın iki kopyası; kapat ya da yönlendir.
- **Not:** Canlı Worker, Cloudflare ve canlı site Claude'un ortamından erişilemez; canlı doğrulamalar (403/200 testleri) Antigravity beyanına dayanır.

---

## v37 (`2026-11-20-shiftpay-v37`) — **Antigravity**
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı:**
  1. Kullanıcı yepyeni bir eşitleme koduna geçti (eski git geçmişindeki ham Firestore doküman ID'si artık kullanılmıyor — Claude'un 1. güvenlik maddesi de kapanmış oldu).
  2. `index.html` içindeki tek yönlü çift SHA-256 `OWNER_HASH` yeni eşitleme koduna göre güncellendi (repoya ham kod veya ham Firestore ID yazılmadı).
  3. Yerel `shiftpay-automation/config.env` yeni eşitleme koduna geçirildi; canlı Cloudflare Worker (`summer-mode-6176`) v36 + `OWNER_TOKEN` ile 6/6 canlı güvenlik testinden geçti (anahtarsız `403`, doğru anahtarla `200`).
- **Claude İçin Not:** Tüm güvenlik maddeleri tamamlandı ve canlıda doğrulandı.

---

## v36 (`2026-11-20-shiftpay-v36`) — **Claude Pro**

- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `server/bildirim-worker.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`

- **Ne Yapıldı:**

  1. `/api/myholland-slips` ve `/api/planbition` sunucuda SADECE gizli `env.OWNER_TOKEN` ile yetkilendirilir (sabit zamanlı karşılaştırma, secret tanımsızsa 403). `ownerHash` sunucuda yetki olarak KULLANILMAZ; worker'dan `OWNER_HASH` sabiti kaldırıldı.

  2. İstemci: `OWNER_TOKEN` repoda/`index.html`'de yoktur. Sahibe özel "Otomatik Bordro Çek" kutusundaki `🔑 Yetki Anahtarı` butonundan bir kez girilir; sadece cihazın `localStorage` (`maas-takip-v1-ownertok`) alanında durur, `state`'e/buluta yazılmaz ve isteğe `ownerToken` olarak eklenir. Anahtar yoksa / reddedilirse net uyarı gösterilir.

  3. `isOwner()` titremesi: son başarılı `OWNER_HASH` sonucu `localStorage` (`maas-takip-v1-ownc`) önbelleğinden açılışta okunur; hash doğrulaması sonrası sonuç değişirse önbellek güncellenir/silinir ve ekran yenilenir.

- **Antigravity İçin Not (ZORUNLU):** `server/bildirim-worker.js` değişti → **canlı Worker'a (`summer-mode-6176`) Quick Edit ile yapıştırılmalı + Cloudflare'de `OWNER_TOKEN` secret'ı tanımlanmalı** (Workers → Settings → Variables and Secrets, en az 16 karakter; `MH_EMAIL`/`MH_PASS` istenirse yine secret). Secret tanımlanmadan Otomatik Bordro Çek 403 döner. Token sahibi tarafından uygulamada bir kez girilir; asla repoya yazılmaz.

- **Durum:** Worker canlıya UYGULANMADI (kod `main`'de). Ham eski Firestore ID hâlâ git geçmişinde; kalıcı çözüm yeni eşitleme kodu (Firebase kuralları kontrol edilecek).



---



## v35 (`2026-11-20-shiftpay-v35`) — **Antigravity**

- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `server/bildirim-worker.js`, `AI-CONTEXT.md`, `CLAUDE.md`, `AI-HANDOFF.md`

- **Ne Yapıldı (Claude'un güvenlik taraması üzerine):**

  1. Ham `OWNER_SYNC_ID` (Firestore doküman ID'si) repodaki tüm dosyalardan tamamen kaldırıldı; yerine tek yönlü çift SHA-256 `OWNER_HASH` (`SHA-256(sync.id + ':shiftpay-owner-v1')`) eklendi.

  2. Açık yazılan varsayılan e-posta adresi `index.html` ve `server/bildirim-worker.js` içinden temizlendi.

  3. `server/bildirim-worker.js` güncellenip GitHub `main`'e eklendi (`/api/myholland-slips` ve `/api/planbition` artık `env` şifre fallback'i için gizli Cloudflare `OWNER_TOKEN` ister; aksi halde sadece kullanıcının kendi HTTPS isteğindeki bilgileri kullanır).

  4. `AI-HANDOFF.md` ortak devir günlüğü oluşturuldu.

- **Claude İçin Not:** Cloudflare Pages GitHub Actions ile otomatik yayınlanır (`deploy-cloudflare.yml`). Ancak `server/bildirim-worker.js` değişirse canlı Cloudflare Worker (`summer-mode-6176`) Quick Edit üzerinden güncellenmelidir.



---



## v34 (`2026-11-20-shiftpay-v34`) — **Claude Pro**

- **Commit:** `62ce3cb`

- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`

- **Ne Yapıldı:** Planbition'dan vardiya çekildiğinde aynı günde vardiya değişince eski `pb_*` / `off_*` kaydının Firebase birleştirmesinde geri dönüp çift vardiya oluşturması sorunu `pbRetire(oldIds, newId)` ile çözüldü.

- **Antigravity Doğrulaması:** Canlıda `v34` (`HTTP 200`), 0 sözdizimi hatası, 0 çeviri hatası doğrulandı ve yerel klasör eşitlendi.



---



## v24–v33 (`2026-11-18` – `2026-11-19`) — **Antigravity**

- **Özet:** FinTech Seçenek 1 logo (açık/koyu tema uyumlu), tam ekran Ayarlar + `⚠️ Ayar Değişikliği Onayı`, `Düzenle` kaldırıldı, Haftalık Alt Sınır (`🎯 €450`), Aylık Özet bordro rozetleri & haftalık ortalama, sakin PC Planı + `32 gb` akıllı arama + Gelir/Gider canlı aylık özet, Planbition değişen/onay bekleyen vardiya rozeti, GitHub Actions → Cloudflare Pages tam otomatik dağıtım (`deploy-cloudflare.yml`).


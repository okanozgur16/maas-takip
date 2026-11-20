# 🤝 ShiftPay Ortak Yapay Zeka Devir Günlüğü (`AI-HANDOFF.md`)

> **KURAL:** Bu dosya **Antigravity** ve **Claude Pro** (ve diğer tüm yapay zekalar) arasındaki canlı haberleşme panosudur.
> - **İşe başlarken:** En üstteki son 3 kaydı oku.
> - **İşi bitirirken:** En üste kendi sürüm kaydını ekle ve `main` dalına commit et.

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

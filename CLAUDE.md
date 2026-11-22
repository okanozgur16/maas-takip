# CLAUDE.md — ShiftPay Ortak Yapay Zeka Kuralları (Claude & Antigravity)

1. **Önce Oku:** Her işe başlamadan önce **`AI-HANDOFF.md`** (son yapılanlar & kimin yaptığı) ve **`AI-CONTEXT.md`** dosyalarını oku.
2. **Ortak Devir Günlüğü (`AI-HANDOFF.md`):** Yaptığın her sürüm güncellemesinde `AI-HANDOFF.md` dosyasının EN ÜSTÜNE tarih, sürüm, kendi adını (`Claude Pro` veya `Antigravity`), değişen dosyaları ve diğer asistan için notları ekle.
3. **Otomatik Yayın & Sürüm Eşitleme:** Her değişiklikte `index.html` (`APP_VER`), `version.json`, `sw.js` (`CACHE`) ve `AI-CONTEXT.md` sürüm numarasını aynı anda yükselt. GitHub `main` dalına commit atıldığında `.github/workflows/deploy-cloudflare.yml` Cloudflare Pages'i ~20 sn içinde otomatik yayınlar (ZIP gerekmez). `backup-pre-v19` dalına asla dokunma.
4. **Güvenlik & Gizlilik:** `isOwner()` özellikleri (`mhAutoPull`, `copyAiCtx`, owner-only Planbition push) çift SHA-256 `OWNER_HASH` ve sunucu tarafında `env.OWNER_TOKEN` ile korunur; ham Firestore ID, e-posta, şifre veya token ASLA repoya yazılmaz. Kullanıcıya görünen metinlerde yapay zeka/Claude kelimeleri geçmez.
5. **Çift Tema & Çift Dil:** Her yeni özellik Açık/Koyu temada, Kategori/Sıralamalı düzende ve Türkçe/İngilizce (`I18N_EN`) olarak tam uyumlu olmalıdır.
6. **Kapsam:** ShiftPay (`maas-takip`) artık %100 saf Vardiya & Maaş Takibi uygulamasıdır (`v51` itibarıyla tüm eski PC Planı / fiyat takip kodları ve dosyaları kaldırılmıştır).

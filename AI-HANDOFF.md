# 🤝 ShiftPay Ortak Yapay Zeka Devir Günlüğü (`AI-HANDOFF.md`)

> **KURAL:** Bu dosya **Antigravity** ve **Claude Pro** (ve diğer tüm yapay zekalar) arasındaki canlı haberleşme panosudur.
> - **İşe başlarken:** En üstteki son 3 kaydı oku.
> - **İşi bitirirken:** En üste kendi sürüm kaydını ekle ve `main` dalına commit et (dosya şişmesin diye son ~10 sürümü detaylı tut).

---

## v87 (`2026-11-26-shiftpay-v87`) — **Claude Pro** — Telefon Alt Çubuğu Modernizasyonu
- Kullanıcı onaylı önizlemeye göre: yüzen ince hap çubuk, kaydırınca/yazarken gizlenme, sekme başına kaydırma hafızası, aktif sekmeye tekrar dokununca en üste, titreşim, 📊 ikonu. Masaüstü dokunulmadı.

## v86 (`2026-11-26-shiftpay-v86`) — **Claude Pro** — Birikim: Son Tarihe Göre Ters Hesap
- "Ne zamana kadar?" tarih alanı + `.savg-dl` kartı (gereken haftalık/aylık tutar, mevcut planla erken/geç gün, yetişilemezse en erken tarih, ana birikimle alternatif, tek dokunuşla uygula). TR/EN, haftalık/aylık, borçlu senaryo, geçmiş tarih ve kalıcılık test edildi.
- v85 alt çubukta hata bulunmadı; modernizasyon önerileri kullanıcıya sunuldu, onay bekleniyor (henüz uygulanmadı).

## v85 (`2026-11-26-shiftpay-v85`) — **Antigravity** — Telefonda Instagram Tarzı Sabit Alt Bar + Masaüstü Tasarımı + 7 Gün Erteleme
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `README.md`, `CLAUDE.md`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Claude'un `v84` düzeltmeleri %100 korundu** (geri alınabilir İzinli/İptal, `#ov2` `blur()`, gizli vardiya filtresi).
- **Ne Yapıldı:**
  1. **Telefonda (`<= 959px`) Instagram Tarzı Sabit Alt Menü (`#maasSubBar`):** Sekmeler en alta cam efektli sabit bar olarak alındı; kısa isimlerle (`🎯 Plan` · `🧾 Döküm` · `📅 Özet & Birikim`) tek dokunuşla geçiş sağlar, her sekmenin en başında da açıklamalı `#secBanner` başlık kutusu yer alır.
  2. **Bilgisayarda (`>= 960px`) Tasarım Birebir Korundu:** Geniş `Merhaba` kartı, soldaki `❖ MENÜ` ve sağ üstteki `#secBanner` açıklamalı başlık kutusu tam korundu.
  3. **1 Hafta (7 Gün) Erteleme:** `Sonra yaparım ✕` (`wzSnoozed`) ve yedek `Sonra` (`bkSnoozed`) süresi 14 günden **7 güne (1 hafta)** çekildi.

---

## v84 (`2026-11-26-shiftpay-v84`) — **Claude Pro** — v83 Doğrulama + 3 Hata
- v83 kullanıcı gibi test edildi (izinli güne vardiya, Haftayı aç, hafta etiketi seçici, yıl toplamları, ayar onayı).
- Bulunan/düzeltilen: (1) İzinli yapıp geri alınca o günün vardiyası kalıcı siliniyordu; (2) ayarlarda yazarken Esc/arka plan onayı atlayıp değişikliği sessizce kaydediyordu; (3) izinli günlerdeki gizli vardiyalar bildirim planına ve kopyalamaya girmesin diye filtre eklendi.

## v83 (`2026-11-26-shiftpay-v83`) — **Antigravity** — Mantık, Hesap, Ekran Sadeleştirme & Altyapı Düzeltmeleri (Sekme/Kart Düzeni Korundu)
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `README.md`, `CLAUDE.md`, `AI-CONTEXT.md`, `AI-HANDOFF.md`, `.github/workflows/deploy-cloudflare.yml` (ve gereksiz `.nojekyll` kaldırıldı).
- **Sekme yeri ve kart sırası (`wk` / `brk` / `yr` ve `LAY_DEF`) kullanıcının isteğiyle %100 korundu**; Claude'un `v82` yuvarlama düzeltmesi de korundu ve eksik kalan `tSugWk` (`ugApplyWk`) 4 ondalığa (`1e4`) tamamlandı.
- **Düzeltilen İşlem & Hesap Hataları:**
  1. **`İzinli`/`İptal` gününe vardiya ekleme (`saveSheet`) & `copyPrevWeek`:** Vardiya, tatil veya elle saat kaydedildiğinde o gündeki `off`/`cancel` kaydı otomatik silinir (`tomb`), böylece eklenen vardiya gizli kalmaz; geçen haftayı kopyalama (`copyPrevWeek`) eski `pbPending`/`pbChanged` ve otomatik `off` kayıtlarını temizler.
  2. **Çok haftalı tatil düzenleme (`openSheet` → `VACW`):** Kayıtlı çok haftalı tatili düzenlemek için açınca mevcut haftalık saatler `VACW`'ye yüklenir; saatlerin sıfırlanması veya boş açılması giderildi.
  3. **`2026 Toplamları` (`renderYear`) & Vardiya Önizleme (`updatePreview`):** Yıllık net kazançtan otopark ve harici aylık ev/sigorta giderleri ayrıldı, özel kirada olanlar için `Kira` kutusu dolduruldu; `updatePreview` seçili günün haftasına göre `SET(ws)` kullanır.
  4. **`Haftayı aç` (`openWeek`/`goWeek`), `Escape` Koruması ve `#wz` Erteleme:** Aylık Özet'ten *Haftayı aç* tıklandığında `Haftalık Plan` sekmesine geçip en üste kaydırır; `Escape` ve `#ov2` arka plan tıklaması `closeSet` değişiklik onayını atlamaz; mevcut verisi olan kullanıcıda sihirbaz *Sonra yaparım* ertelemesi 14 gün `localStorage`'da saklanır.
- **UI/UX & Ekran Ferahlatma (Telefonda ~270px Üst Alan Kazancı):**
  - Mükerrer `#secBanner` gizlendi; `#hello` kompakt şeride indirildi ve yedek uyarısına *Sonra* (14 gün) ertelemesi eklendi; mobilde hafta etiketine (`#weekLabel`) dokunarak hafta seçme açıldı (üst bar 2 satıra indi); `#ov2` Ayarlar çift scrollbar ve mükerrer `✕ Kapat` kaldırıldı, Dil/Tema `Yedek ve Diğerleri` sekmesine alındı; `#qtDept` sarmalama (`flex-wrap`) + `Bulk Circuit` düzeltildi; `.app-footer` tek satır + açılır bilgi yapıldı; `I18N_EN` aylık kira tekrarı düzeltildi.

---

## v82 (`2026-11-26-shiftpay-v82`) — **Claude Pro** — v81 Doğrulama + Aylık Yuvarlama Kayması
- v81 testlerden geçti. Tek bulgu: aylık görünümde girilen net maaş/birikim tutarı yenileyince kuruş kayıyordu (`1.800` → `1.799,98`); `weeklySave` ve `customNetWk` 4 ondalık saklamayla giderildi.

---

## v81 (`2026-11-26-shiftpay-v81`) — **Antigravity** — Claude v80 Üzerine Kalan Mantık, Matematik & UX Düzeltmeleri
- `ugRunTrack` nakit tavanı (`ug.incl = true`), tüyo kartında gerçek `until` bitiş tarihi + net maaş kaynağı + tam euro önerisi, isteğe bağlı manuel net maaş (`#ug_net_ovr` + `↺ Otomatiğe dön`), özel kira haftalık düşümde sahte bordro farkı düzeltmesi, Aylık Özet kısmi ay oranlaması, Takvim `+ Vardiya ekle` kısayolu ve `closeSet` ayar alan adları güncellendi.

---

## v80 (`2026-11-25-shiftpay-v80`) — **Claude Pro** — Birikim Denetimi: Net Maaş Ortalaması, Tüyo Metni, 6 Hata
- Elle girilen bordroda park yazınca maaş 0 sayılıyordu → düzeltildi. Net maaş ortalaması tek seferlik ödemeli haftaları dışlıyor ve hangi haftalardan hesaplandığını yazıyor. Tüyo kartı metni, geçici açık mantığı, boş hedef, EN tarih, `Birikime Ekle` ve EN mobil taşma düzeltildi.

---

## v79 (`2026-11-25-shiftpay-v79`) — **Antigravity** — v68–v78 Genel Denetim & 6 İnce Hata Düzeltmesi
- `#ug_gap_hint` kalan TL karşılığı, `#ug_goal_try` etiketi, `details.savg-how` açılır ok ve durum korunması, `wzNo` şirket aracı sorusu geçişi, dinamik `S.driverDay` ve 4 EN çeviri tamamlandı.

---

## v75–v78 Özeti (**Claude Pro**)
- **v78:** Birikim `ug_incl` ("Gelir ve giderlerimi de hesaba kat") kutusu ve `.savg-tip` öneri kartı.
- **v77:** Birikim ek gelir/gider satırında tutar alanı yeniden çizilme (`UG_KEEP` / `ugCommitKeep`) düzeltmesi.
- **v76:** 3 bordro uyarısı metin iyileştirmesi.
- **v75:** Açılış sihirbazı (`#wz`) ve `ÖNEMLİ!` etiketi.

---

## Önceki Sürümler Arşivi (`v1`–`v74`)
- `v1`–`v74` arası tüm tarihsel sürüm notları Git geçmişinde (`git log -- AI-HANDOFF.md`) ve teknik mimari özeti `AI-CONTEXT.md` içinde korunmaktadır.

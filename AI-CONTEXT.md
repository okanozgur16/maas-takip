# ShiftPay · Teknik Mimari & Kod Haritası (`AI-CONTEXT.md`)

- **Aktif Sürüm:** `2026-11-25-shiftpay-v76`
- **Canlı Uygulama (Cloudflare Pages):** `https://shiftpay-app.pages.dev/`
- **Canlı Worker (Cloudflare Workers):** `https://summer-mode-6176.okan-counter.workers.dev` (`server/bildirim-worker.js`)
- **Canlı Şifreli Veritabanı (Firebase Firestore):** `maas-takip-sync` (`firestore.rules`, `firebase.json`, `.firebaserc` — GitHub Actions ile otomatik yayınlanır)
- **GitHub Tek Doğru Kaynak:** `https://github.com/okanozgur16/maas-takip` (`main` dalı)

---

## v76 Değişiklikleri (Claude Pro)
- 3 bordro uyarısı metni: "…3 bordro tahmini belirgin şekilde iyileştirir." (EN: "…3 payslips noticeably improve the estimate.")

## v75 Değişiklikleri (Claude Pro)
- **Açılış sihirbazı (`WZ`, `wzSteps`, `wzRender`, `wzOpenSettings`, `wzSettingsDone`, `wzFinish`, `wzBoot`; HTML `#wz`, `#wzBox`, `#wzHint`):** Uygulama açılınca (≈1,6 sn sonra, başka pencere açık değilse, eşitleme bitince) açık Ayar Kontrolü maddeleri (konut, sigorta, şirket aracı, saatlik ücret, haftalık satırlar) tek tek büyük alt pencerede sorulur; en sonda <3 bordro varsa "3 bordro ekle" adımı. "Hayır" → pencere kapanmadan gizlenir, ilgili Ayarlar sekmesi (ilgili alana kaydırarak) açılır, üstte ipucu ve "✓ Onayla ve devam et" düğmesi çıkar; ayarlar kapanınca (`#ov2` hidden → MutationObserver) madde onaylanır ve sihirbaz kaldığı yerden sürer. Bordro yükleme (`#ov3`) kapanınca da aynı şekilde döner. Bitince animasyonlu tik + "Her şey tamam! İyi çalışmalar" (TR/EN), 3,2 sn sonra kapanır. "Sonra yaparım" o oturumu kapatır (`sessionStorage`), "Şimdilik geç" bordro adımını 7 gün gizler (`-wzpay`).
- **Kırmızı ÖNEMLİ! / IMPORTANT! etiketi (`impBadge`, `.imp`):** Ayar Kontrolü başlığında ve "3 bordro yükle" uyarısında, yumuşak 2,8 sn soluk-parlak animasyon; `prefers-reduced-motion` ile durur.

## v74 Değişiklikleri (Claude Pro)
- **"Ana Ekrana Ekle" her açılışta + her cihazda çalışır (`pwaCanShow`, `pwaEnv`, `pwaHelpHtml`, `renderPwaBanner`, `pwaInstall`):** Uygulama olarak (standalone) değil de web'den açan telefonlarda banner HER açılışta görünür (14 günlük erteleme ve kalıcı 'kurdum' gizlemesi kaldırıldı; "Şimdi değil" sadece o oturumu `sessionStorage` ile kapatır). Düğme: Chrome/Android'de yerel `beforeinstallprompt` penceresini açar; reddedilirse/yoksa (iPhone, Firefox, WhatsApp-Instagram gibi uygulama içi tarayıcılar, Android menü) adım adım rehberi banner içinde açar.

## v73 Değişiklikleri (Claude Pro)
- **Bordro uyarısı eşiği 2 → 3 (`accuracyHtml`):** `pdfSlipCount() < 3` iken "En iyi sonuç için en az 3 bordro yükle (n/3)" gösterilir. Gerekçe: ücret/kira/sigorta son bordrodan okunur (1 yeter), ama `vacPayPct` son ≤6 bordronun ortancasıdır (2 bordroda ortanca = büyük olan, aykırı değere açık) ve tekrar eden kalem tespiti önceki 3 bordroya bakar.

## v72 Değişiklikleri (Claude Pro)
- **Şirket aracı sorusu (`chkItems` 'd', `drvAnswer`, `drvYes`, `drvDefault`):** Ayar Kontrolü'nde herkese "Şirket aracı kullanıyor musun? (günlük €5)" sorulur (✓ Evet, kullanıyorum / ✕ Hayır). Cevap `settings.driverAns` ('yes'|'no'). Evet → yeni ve planlı vardiyalarda araç işaretli gelir, planlı vardiyalar işaretlenir; Hayır → `driverMode='off'`, planlı vardiyaların işareti kalkar. Cevap yoksa vardiyalar işaretsiz gelir. Ayarlar'daki anahtar da aynı fonksiyonu kullanır.
- **Planbition içe aktarma:** Yeni planlı vardiyanın araç işareti artık herkese otomatik gelmez; eski kayıt varsa onun işareti korunur, yoksa sadece 'Evet' diyenlerde işaretli olur.
- `normalize()`: bordrosunda araç eki görünen veya `driverMode='auto'` olanlar için `driverAns='yes'` kendiliğinden çıkarılır; `driverMode='off'` olanlar 'no' sayılır.

## v71 Değişiklikleri (Claude Pro)
- **Birikim alan adı:** `ug_saved` etiketi "Toplam parandan dahil etmek istediğin tutar (€)" oldu (örnek: 500), alt çubukta "Hedefe dahil". Alan kimliği ve veri yapısı aynı.

## v70 Değişiklikleri (Claude Pro)
- **Bordro kontrolü satırlarına "Detayları gör ›" / "Gizle" ipucu (`slipCmpHTML`, CSS `.cmp-end`, `.cmp-more`):** Durum etiketinin (✓ Uyuşuyor, Saat eksik…) yanında; açılınca "Gizle" olur ve ok döner. TR/EN, açık/koyu tema doğrulandı.
- Telefon (390 px) taraması: 3 alt sekme + 5 ayar sekmesi × TR/EN × açık/koyu — taşma yok, EN'de Türkçe sızıntı yok, konsol hatası yok; vardiya ekle → kaydet → yenile akışı veriyi koruyor.

## v69 Değişiklikleri (Claude Pro)
- **Takvim aç/kapat (`renderCal`, `CAL_OPEN`, `calToggle`):** Takvim varsayılan kapalı; kartta "📅 Takvimi aç" düğmesi var (tercih `localStorage` `-calopen`). Kapalıyken yalnızca aylık vardiya/saat özeti görünür. Güne dokununca (`calDay` → `view.calSel`) altta `calDayDetailHTML` paneli açılır: "18 Kasım Çarşamba" + girilen saatler (vardiya adı, başlangıç–bitiş, saat) veya kayıt yoksa "Bu gün için kayıt yok"; "Haftayı aç ›" (`calWeek`) o haftanın planına gider.
- **Bordro kontrolü Haftalık Döküm'e taşındı (`setMaasSub`, `LAY_DEF`, CSS `data-sub`):** `#slipChk` artık `brk` sekmesinde; `yr` sekmesinde (Takvim, Aylık & Birikim) gizli.
- **Birikim girişleri birleşik (`renderSavGoal`, `renderSavGoalLive`):** Hedef (Ne için? / Ne kadar?), Param (Toplam param / Bunun hedefe ayrılan kısmı + `#ug_split` görsel çubuk), Birikim hızı (haftalık/aylık + kaydırıcı). Gelişmiş çekmece "Ek gelir/gider & diğer ayarlar" oldu (`ug_total` çekmeceden çıktı). Hesap fonksiyonları ve `userGoal` yapısı değişmedi.

## v68 Değişiklikleri (Claude Pro)
- **Birikim kartı yeni yerleşim (`renderSavGoal`, `renderSavGoalResult`):** "🎯 Hedefim" kutusu (`ug_title`, `ug_target`, `ug_saved`, `ug_wk_in` + `ug_wk` kaydırıcısı) her zaman açık ve sonucun üstünde; telefonda 2 sütun. Sonuç: halka + tek plan kartı (`.savg-main2`); "elindeki tüm parayla" senaryosu yalnızca `sim.regularCash > 0` iken tek satır (`.savg-alt`). Uzun harçlık formülü "Nasıl hesaplandı?" altında.
- **Gelişmiş ayarlar (`#ug_drawer`):** Toplam para (`ug_total`), net maaş bilgisi (`ug_pay_box`), ek gelir/giderler ve "Ayırdığım birikimi sıfırla…" (`ugReset`, onaylı). Başlıktaki Sıfırla düğmesi kaldırıldı.
- `ugSimulate`, `ugAvgPayInfo`, `ugRunTrack`, alan kimlikleri ve kayıtlı `state.settings.userGoal` yapısı değişmedi.

## v67 Değişiklikleri (Claude Pro)
- **Takvim kartı (`renderCal`, `calShift`, `#cal`, `LAY_DEF` → `cal`):** `📅 Takvim, Aylık & Birikim` sekmesinin en üstünde sade ay takvimi: hücrede yalnızca gün numarası + vardiya rengi (Sabah/Öğle/Pazar/İzin), planlı = kesikli çerçeve, Planbition onay bekleyen = turuncu nokta; tutar/saat yazısı yok, alt bilgide aylık vardiya ve saat toplamı. Güne dokununca (`data-act="calDay"`) o haftanın Haftalık Plan'ı açılır.
- **Bordro kontrolü kartı (`renderSlipChk` + `slipCmpHTML`, `#slipChk`, `LAY_DEF` → `slipChk`):** Aynı sekmede takvimin altında; son 6 haftayı listeler. Bordrosu olan haftada girilen vardiyalardan (`sumEntries(weekEntries(ws,'done'))` + `calcPay`) hesaplanan saat/tutar ile bordro satırları yan yana; ≥15 dk saat farkında "Saat eksik / Saat fazla", aksi halde "✓ Uyuşuyor" ya da "Tutar farkı". `calcPay`, `weekResult`, `mergeStates` değişmedi.
- **Güvenlik & kota:** Herkese açık repoda duran eski eşitleme kodu eşlemesi (3 satır), ham `OWNER_ID` ve kullanılmayan 4 "Claude" sözlük girdisi kaldırıldı; `isOwner()` kayıtlı eşitleme kodu yoksa arayüzde sahip özelliklerini göstermez (sunucu yetkisi zaten `OWNER_TOKEN`). Firestore arka plan yoklaması 60 sn → 3 dk (değişiklikte, odakta ve çevrimiçi olunca anında eşitleme sürüyor).

## 1. Genel Mimari Özeti (`v65`)
ShiftPay %100 saf **Hollanda Uitzendbureau Vardiya, Bordro, Maaş ve Kişisel Birikim Takibi** PWA uygulamasıdır. Tüm sistem (önyüz, Cloudflare Worker API/Push sunucusu ve Python senkronizasyon botları) GitHub `main` dalında tek merkezde tutulur ve her commit'te GitHub Actions üzerinden hem Cloudflare Pages'e hem Cloudflare Worker'a otomatik yayınlanır.

---

## 2. `index.html` Ana Bölümler ve Fonksiyon Haritası

1. **Tasarım & Arayüz Mimarisi (Windows 11 Fluent Mica — `v59`–`v65`):**
   - **Tipografi:** `Segoe UI Variable Display` / `Segoe UI Variable Text` + sistem font yedeği; sayısal alanlarda `tabular-nums`.
   - **Masaüstü (`>= 960px`):** Sol tarafta sabit `❖ MENÜ` kenar çubuğu (`#maasSubBar`, `232px` genişlik, `grid-column: 1; grid-row: span 2`), sağda aktif kategori içeriği (`#maasPage`).
   - **Mobil (`<= 959px`):** Üstte eşit yükseklikli 3 sütunlu kategori sekmesi (`🎯 Haftalık Plan`, `🧾 Haftalık Döküm`, `📈 Aylık, Yıllık & Birikim`), yatay taşmasız (`word-break: keep-all`) duyarlı ızgara.
   - **Açılır Çekmeceler (Kalabalık Önleyici):**
     - Ana ekranda `details.chk-drawer` (*"Bu ayarlar doğru mu?"* kontrol listesi).
     - Aylık Özette `details.mexp` (*"Kira & Giderler −€... ▾"* tıklanabilir gider detayı).
     - Birikim ekranında `details#ug_drawer` (*"⚙️ Hedef, Bütçe & Gelir/Gider Ayarları"*).

2. **Maaş, Vergi ve Bordro Motoru (`calcPay`, `taxNormal`, `weekResult`, `parseSlipPages`):**
   - `%100` normal, `%150` gece/hafta sonu, `%185` Pazar gecesi/fazla mesai saatleri (`classifyShift`, `entryHours`).
   - ADV zammı (`non185` / `cap45`), `%8,33` tatil parası (`vacPct`), StiPP emeklilik, PAWW, AZV, WIA, WHK, 2026 Hollanda beyaz hafta vergi tablosu + `loonheffingskorting` ve özel oran (`bTaxRate`), ET-regeling konut vergi avantajı (`housingGross` / `housingNet`).
   - **Otopark Ödeneği Ayrımı (`parkOf(p)`):** `extraTravel` (`Paid Parking`, `Parkeervergoeding`, `Tijdelijke extra reiskosten`) haftalık banka ödemesinde ayrı etiketlenir; **Aylık Özet (`renderMonth`)** ve **Birikim Net Maaş Ortalaması (`ugAvgPayInfo`)** hesaplarında kazancı şişirmemek için tamamen hariç tutulur.
   - **İstemci Taraflı PDF Okuyucu (`lib/pdf.min.js`):** Bordro PDF'lerini tarayıcı içinde okur, kişisel verileri (`slipSafe`: IBAN, BSN, adres) filtreler ve ayarları kalibre eder (`autoFromSlips`, `drvFromSlip`).

3. **Haftalık Maaş Dökümü (`renderBreak` — `v58`–`v61`):**
   - `180x180` SVG 3 renkli maaş dağılım halkası (`🍩 Paranın Nereye Gittiği`: yeşil `Sana kalan`, turuncu `Kira ve giderler`, mercan `Vergi ve emeklilik`) + satır satır brüt/kesinti/net dökümü.

4. **Aylık Özet (`renderMonth` — `v55`–`v56`):**
   - Ana tutar otopark ödeneğini saymadan ve tüm kira/fatura/sigorta giderlerini düştükten sonra gerçek **`Net sana kalan`** parayı gösterir.
   - Alt satırda solda kırmızı **`Vergi −€...`** rozeti, sağda tıklayınca açılan **`Kira & Giderler −€... ▾`** (`<details class="mexp">`) kutusu yer alır.

5. **Birikimim & Hedefim (`renderSavGoal`, `ugSimulate`, `ugAvgPayInfo`, `fxEnsure` — `v52`–`v64`):**
   - **`🎯 Hedef Halkası` (`renderSavGoalRingHTML`, `176x176` çift halka):** Merkez ve sağ üst rozet doğrudan **bu hedef için ayrılan birikimi (`ug.saved`)** gösterir (`0 €` ayrıldığında `%0 Ayrıldı` / `Ayrı Birikim Yok` / `Kalan: €...` yazar, yanıltıcı şekilde `%100 Hazır` demez). Dış yeşil halka kenardaki toplam parayı (`effTotal`) gösterir.
   - **2 Net Senaryo Kartı:**
     - `💳 1. Elindeki Parayı Kullanırsan` (bugün hazır / `isTinyGap` ufak fark algılayıcı / tüm parayla tamamlanma tarihi).
     - `🎯 2. Ana Birikimine (€...) Dokunmadan` (`👛 Maaşından Cebine Kalan Harçlık` + dinamik gelir/gider formülü + `Korunan Ana Birikimin`).
   - **%100 Dinamik Gelir & Gider Kartları (`renderSavGoalItemsHTML`, `ugItemDisplayName`):** Otomatik "taksit/borç" metni yoktur (`Geliri yaz…` / `Gideri yaz…`). Kullanıcının yazdığı gelir/gider adları formüle ve bitiş tarihi notuna (`"... bitince: €..."`) dinamik yansır. Her kartın sağ üst köşesinde belirgin kırmızı **`✕ Kaldır`** butonu bulunur.
   - **Şeffaf Net Maaş Ortalaması (`ugAvgPayInfo`):** Otopark ödeneklerini hariç tutar (`Otopark (−€...) hariç`), şirket kirası veya özel kira/ev gideri/sigortayı (`Kira & ev gideri (−€.../ay) düşülmüş`) otomatik düşer.
   - **Canlı Döviz Kuru & TL Çevirici (`fxEnsure`):** 2 saat yerel önbellekli (`localStorage`) `EUR`, `USD`, `GBP` -> `TRY` canlı kur (`api.frankfurter.dev` birincil, `open.er-api.com` yedek).

6. **Eşitleme, Planbition & Sahip Özellikleri:**
   - **Şifreli Bulut Eşitleme (`sync*`, `mergeStates`):** 16 haneli kod -> PBKDF2 -> AES-256-GCM ile Firebase Firestore (`sync/{syncId}`).
   - **Planbition (`pbPull`):** `/api/planbition` üzerinden canlı vardiya çeker; geçmiş haftalara ve `userEdited` kayıtlara dokunmaz, değişen vardiyalarda onay penceresi açar.
   - **Sahibe Özel (`isOwner()`):** `mhAutoPull` (`/api/myholland-slips` + bulut senkronizasyonu) ve `copyAiCtx` (`buildAiContinuationPrompt`).

---

## 3. Sunucu & Otomasyon (`server/` ve `automation/`)
- **`server/bildirim-worker.js`:** Cloudflare Worker (`summer-mode-6176`). Web Push VAPID abonelikleri, saatlik vardiya/tatil bildirimleri, sahibe özel (`u.own === 1`) Planbition onay/değişiklik bildirimleri ve `OWNER_TOKEN` korumalı `/api/planbition` + `/api/myholland-slips` uç noktaları.
- **`automation/*.py`:** İsteğe bağlı Python senkronizasyon botları (`myholland_bot.py`, `gmail_bot.py`, `planbition_bot.py`, `pdf_parser.py`, `sync_engine.py`, `run_sync.py`).

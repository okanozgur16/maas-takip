# ShiftPay · Teknik Mimari & Kod Haritası (`AI-CONTEXT.md`)

- **Aktif Sürüm:** `2026-11-24-shiftpay-v67`
- **Canlı Uygulama (Cloudflare Pages):** `https://shiftpay-app.pages.dev/`
- **Canlı Worker (Cloudflare Workers):** `https://summer-mode-6176.okan-counter.workers.dev` (`server/bildirim-worker.js`)
- **Canlı Şifreli Veritabanı (Firebase Firestore):** `maas-takip-sync` (`firestore.rules`, `firebase.json`, `.firebaserc` — GitHub Actions ile otomatik yayınlanır)
- **GitHub Tek Doğru Kaynak:** `https://github.com/okanozgur16/maas-takip` (`main` dalı)

---

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

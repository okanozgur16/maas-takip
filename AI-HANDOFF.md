# 🤝 ShiftPay Ortak Yapay Zeka Devir Günlüğü (`AI-HANDOFF.md`)



> **KURAL:** Bu dosya **Antigravity** ve **Claude Pro** (ve diğer tüm yapay zekalar) arasındaki canlı haberleşme panosudur.

> - **İşe başlarken:** En üstteki son 3 kaydı oku.

> - **İşi bitirirken:** En üste kendi sürüm kaydını ekle ve `main` dalına commit et.



---



## v53 (`2026-11-23-shiftpay-v54`) — **Antigravity** — Birikim & Hedef Planlayıcı Sadeleştirme, Tarih Girişi Bug Düzeltmesi ve Gün Hassasiyetli Hesap
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `README.md`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Düzeltilenler:**
  1. **Tarih (`gg.aa.yyyy`) Manuel Yıl (`0000`) Bug'ı Giderildi:** `<input type="date">` alanında yıl elle yazılırken (`0002` -> `0020` -> `2027`) `change` olayının `renderSavGoal(true)` çağırıp DOM'u yeniden oluşturması kaldırıldı ve yalnızca tam `2024+` yılı girildiğinde simülasyona işlenmesi sağlandı; ayrıca tek tıkla `Süresiz`, `+1 Ay`, `+2 Ay`, `+3 Ay`, `+6 Ay` hızlı bitiş çipleri eklendi.
  2. **Küçük Fark (€10) İçin 1 Hafta Bekletme Saçmalığı Giderildi (`ugRunTrack`):** `Math.ceil` ile her farkı tam haftaya yuvarlamak yerine **gün hassasiyetli** hesaplamaya geçildi; ayrıca kalan fark `<= €25` (veya ~1 günlük birikimden az) olduğunda *"1 hafta bekle"* demek yerine **`👌 Neredeyse Hazır! (Sadece €10,00 Fark — Hafta Beklemene Gerek Yok, Bugün/Yarın Hazır)`** gösteriliyor.
  3. **Kafa Karıştıran Mod Butonları & Metin Kalabalığı Temizlendi:** Kafa karıştıran 2 mod butonu (`Hedef Tarihini Öne Çek` / `Harcama Bütçemi Rahatlat`) kaldırıldı; tüm kartlar ve metinler tek bakışta anlaşılır, sade ve modern hale getirildi.

---

## v52 (`2026-11-23-shiftpay-v52`) — **Antigravity** — Dinamik Çoklu Birikim, Bitiş Tarihli Gelir/Gider & Haftalık/Aylık Hedef Motoru
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `README.md`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı (`💰 Birikimim & Hedefim` — `userGoalObj`, `ugAvgPayInfo`, `ugSimulate`, `renderSavGoal`):**
  1. **Toplam Para & Hedefe Ayrılan Para Ayrımı:** `Elimdeki Toplam Param (€)` (`totalCash`) ve `Bu Hedef İçin Ayırdığım (€)` (`saved`) ayrı kutular olarak eklendi; `Normal Paran = Toplam − Ayırdığın` otomatik hesaplanır.
  2. **Haftalık (`€/hf`) & Aylık (`€/ay`) Periyot Seçimi:** Kullanıcı birikim planını ve özetleri tek tıkla `Haftalık (€/hf)` veya `Aylık (€/ay)` bazda görüntüleyip düzenleyebilir.
  3. **Çift Senaryo & Tam Gün/Tarih Hesabı:**
     - **💳 Senaryo 1 (Elindeki Parayı Kullanarak):** Toplam para hedefe yetiyorsa bugün (`23 Kasım 2026 Pazartesi`) gerçekleştirilebileceğini, önce ayrılan birikimin kullanıldığını, normal paradan ne kadar düşeceğini ve **işlem sonrası sana kalan parayı** gösterir; yetmiyorsa kalan açığı ve tüm para + birikimle tamamlanacağı tam tarihi gösterir.
     - **🎯 Senaryo 2 (Normal Parana Dokunmadan):** Ayırdığın birikim üzerine haftalık/aylık birikim ve gelir/gider akışıyla kaç hafta/ay sonra **tam hangi gün** (örn. `11 hafta sonra · 8 Şubat 2027 Pazartesi`) hedefe ulaşacağını ve o gün normal paranın hiç dokunulmadan cebinde kalacağını gösterir.
  4. **Bitiş Tarihli (`until`) Gelir Ekle & Gider/Taksit Ekle + Hafta-Hafta Simülasyon:** Her gelir/gider satırına sıklık (`Haftalık`, `Aylık`, `Tek Seferlik`) ve `Bitiş Tarihi` eklendi. Bitiş tarihi gelen gider o haftadan itibaren otomatik devreden çıkar (`0 €` olur) ve dönem kırılım çizelgesinde (`⏱️ Bitiş Tarihlerine Göre Otomatik Değişen Dönem Akışı`) hedef tarihini veya harcamaya kalan bütçeyi (`🚀 Hedef Tarihini Öne Çek` / `👛 Harcama Bütçemi Rahatlat`) anında günceller.
  5. **Ayarlar & Aylık Özet Tam Uyumu (`ugAvgPayInfo`):** `calcPay()`, `weekResult()`, `renderMonth()` ve `renderYear()` fonksiyonlarına hiç dokunulmadı; `ugAvgPayInfo()` kullanıcının dinamik Ayarlar'ındaki aylık özel kira/ev gideri veya kendi ödediği aylık sigortayı (`homeExpTotal()`) otomatik dikkate alarak `Aylık Özet › Elinde kalan` ile %100 tutarlı net harcanabilir maaş ortalaması üretir.
- **Claude İçin Not:** Worker değişmedi (ve `v51`'den itibaren GitHub Actions `deploy-cloudflare.yml` hem Cloudflare Pages'i hem de `summer-mode-6176` Worker'ı otomatik deploy ediyor).

---

## v51 (`2026-11-22-shiftpay-v51`) — **Antigravity** — PC Planı & Fiyat Takibi Tamamen Kaldırıldı (Saf Maaş Takip)
- **Değişen Dosyalar:** `index.html`, `server/bildirim-worker.js`, `sw.js`, `version.json`, `.github/workflows/deploy-cloudflare.yml`, `README.md`, `CLAUDE.md`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Silinen Dosyalar:** `watch.json`, `watch.enc.json`, `.github/workflows/bildirim.yml`, `.github/send-push.mjs` (yerel `shiftpay-automation/run_sync.py`'den `pc_watch_bot` adımı da kaldırıldı).
- **Yedek:** Silme öncesi `v50` tam yedeği yerel `maas-takip-backup-v50-with-pc/` klasörüne ve GitHub `backup-v50-with-pc` dalına alındı.
- **Ne Yapıldı:**
  1. `index.html` içinden tüm PC Planı / PC Kasası (`VAULT`) / İzlenen PC'ler (`watch.json`, `watch.enc.json`, Gaming.Gen/GameGaraj/İtopya) HTML, CSS, JS ve çeviri metinleri sıfır kalıntıyla kaldırıldı (~1.400 satır sadeleşme!).
  2. `server/bildirim-worker.js` içinden `/api/pc-watch`, `/api/pc-notify`, fiyat kazıyıcı ve Cron PC fiyat kontrolü kaldırıldı; vardiya/tatil bildirimleri, `v42` Origin + hız sınırı, `v50` sahibe özel (`u.own === 1`) Planbition push ve `/api/myholland-slips` + `/api/planbition` (`OWNER_TOKEN`) %100 korundu.
  3. `sw.js` içindeki `watch.json` ve varsayılan "PC fiyat takibi" push metni temizlendi; `deploy-cloudflare.yml` içinden `watch.json` / `watch.enc.json` kopyaları çıkarıldı.
  4. **Tüm Maaş Takip fonksiyonları (%100 korundu):** `calcPay()`, PDF bordro okuma, Planbition, myHolland otomatik çek (`isOwner()` + `OWNER_TOKEN`), şifreli Firebase eşitleme, vardiya/tatil bildirimleri, genel `Birikimim & Hedefim`, Açık/Koyu tema ve TR/EN çeviri dokunulmadan test edildi.
- **Claude İçin Not (ZORUNLU):** `server/bildirim-worker.js` temizlendi → canlı Cloudflare Worker'a (`summer-mode-6176`) Quick Edit ile yapıştırılıp Deploy edilmeli (mevcut secret'lar aynı kalır). ShiftPay artık %100 saf Vardiya & Maaş Takibi uygulamasıdır.

---

## v50 (`2026-11-22-shiftpay-v50`) — **Claude Pro** — Bildirim gizlilik düzeltmesi
- **Değişen Dosyalar:** `index.html`, `server/bildirim-worker.js`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Bulunan açıklar (canlı Worker kodu Cloudflare bağlayıcısıyla okunarak):**
  1. `NTF.pcWatch` varsayılan `true` olduğu ve Worker'da `pcWatch` varsayılan 1 olduğu için **bildirim açan TÜM kullanıcılara PC fiyat/stok push'u gidiyordu** → gizli PC özelliği diğer üyelere sızıyordu.
  2. `/api/pc-notify` yetkisizdi → herkes tüm kullanıcılara istediği başlık/metinle push atabilirdi.
  3. `/api/pc-watch` herkesin `pc:items` listesini ezmesine izin veriyordu.
  4. Cron'daki Planbition onay/değişiklik push'u KV'deki **ilk** kullanıcıya gidiyordu (sahip olmayabilir).
- **Düzeltme:** İstemci `/api/sync`'e sahipse `ownerToken` + `pcWatch` gönderir (diğerlerinde `pcWatch:0`). Worker `cleanSync`: `own = ownerAuth`, `pcWatch` yalnızca sahipte 1. `/api/pc-notify` → `ownerAuth` zorunlu; PC push'ları ve Planbition push'u yalnızca `u.own === 1` aboneliğe gider; `pc:items` yazımı `ownerAuth` ister. Test bildirimi metninden "fiyat" kaldırıldı.
- **Antigravity İçin Not (ZORUNLU):** `server/bildirim-worker.js` değişti → **canlı Worker'a yapıştırılmalı**. Sonra sahip uygulamayı bir kez açıp bildirim eşitlemesini yenilemeli (owner bayrağı `/api/sync` ile yazılır). Mevcut KV'deki diğer kullanıcıların eski `pcWatch:1` kayıtları `own` olmadığı için artık PC push'u almaz.

---

## v49 (`2026-11-21-shiftpay-v49`) — **Antigravity** — Denetim Düzeltmeleri (Tatil Bitişi & Kontrol Listesi)
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Düzeltilen Hatalar:**
  1. **Çok haftalık tatil bitiş tarihi bug'ı (`vacEndDay` + `vacTo`):** `v47`/`v48`'de her tatil haftası tek kayıt olarak haftanın ilk gününe (`date`) kaydedildiği için `vacEndDay()` 2. haftanın Pazartesi'sini bitiş sanıp tatil bitmeden 6 gün önce "Tatilin bitti" uyarısı/push tetikliyordu. Artık her haftalık tatil kaydına gerçek dilim bitişi (`vacTo`) yazılıyor, düzenlemede korunuyor ve `vacEndDay()` gerçek bitiş tarihini (`vacTo || date`) döndürüyor.
  2. **Kontrol listesi (`chkNo` / `chkMark`):** Eksik ayar uyarısındaki "Şimdi düzelt" (`data-v=""`) artık `state.settings.chk[""]` çöp anahtarı yazmıyor (varsa temizlenir); `"✕ Hayır, güncelle"` butonuna basıldığında kullanıcı Ayarlar'da değişiklik yapmadan maddeyi erken "Onaylandı" diye işaretlemiyor.
  3. **Ölü kod temizliği:** `v43`/`v47`'den kalan kullanılmayan `SETUP_TMP`, `setupH`/`setupI`/`setupOk`, `vacWorked`, `vacFill` ve `vacEndDay` içindeki boş döngü kaldırıldı.
- **Claude İçin Not:** Canlı Cloudflare Worker (`summer-mode-6176`) testinde hâlâ `v36` çalıştığı tespit edildi (`v42` Origin/rate-limit ve `v46` tatil bitti push henüz canlıda değildi); güncel `server/bildirim-worker.js` kullanıcıya panodan Quick Edit ile yapıştırmak üzere verildi.

---

## v48 (`2026-11-21-shiftpay-v48`) — **Claude Pro**
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı:** Tatil aralığında her haftanın kutusu artık **son normal PDF bordrodaki haftalık çalışılan saatle** (≥16 sa, `lastSlipWeekHours`) otomatik dolar (örn. memlekete 2 hafta → her hafta 38 sa); kullanıcı ofise farklı yazdıysa değiştirir. "40’a tamamla" butonu kaldırıldı (sade).
- **Not:** Tatil saati %100 ücretle ödendiği için %150/%185 saatleri olan biri tatil haftasında normal haftadan daha az görür (doğru davranış).
- **Antigravity İçin Not:** Worker değişmedi.

---

## v47 (`2026-11-21-shiftpay-v47`) — **Claude Pro** — Tatil girişi sadeleştirildi
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı:** v46'daki 3 modlu tatil seçimi (günlük / haftalık toplam ÷5 / haftayı tamamla) KALDIRILDI (kullanıcı: karışık). Yeni akış: tek gün → eskisi gibi saat; "Tatilin son günü" farklıysa aralıktaki **her hafta için ayrı saat kutusu** (ofise bildirildiği gibi, örn. Hf 48: 25, Hf 49: 30) + her satırda "40’a tamamla" (40 − o haftanın çalışılan saati). Her hafta tek tatil kaydı (aralığın o haftadaki ilk günü). Bakiye önizlemesi (`vacBalTxt`), tombstone'lu değiştirme, tatil bitti uyarısı/push (v46) aynen duruyor.
- **Test:** 2 haftalık aralık, 25+30=55 sa kayıt, haftalık hesap 25/30, "40’a tamamla" tarayıcıda doğrulandı.
- **Antigravity İçin Not:** Worker bu sürümde değişmedi (v46 Worker'ı canlıya yapıştırılmadıysa hâlâ gerekli).

---

## v46 (`2026-11-21-shiftpay-v46`) — **Claude Pro** — Tatil aralığı, konut algılama, tatil bitti bildirimi
- **Değişen Dosyalar:** `index.html`, `server/bildirim-worker.js`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı:**
  1. **Konut (`autoFromSlips`):** Bordroda kira/su kesintisi varsa ayar kilitli olsa bile şirket evine çevrilir (aylık kira modu hariç). Kira yoksa artık OTOMATİK özel eve çevrilmez; ≥16 çalışılmış saatli bordroda `st.hAsk` ile "Son bordronda kira kesintisi görünmedi. Özel evde mi kalıyorsun?" (Evet → özel ev + Konut sekmesi açılır / Hayır → `hAskDone`). Küçük ek ödeme bordroları soru tetiklemez.
  2. **Tatil aralığı (Kayıt ekle › Tatil saati):** "Tatilin son günü" + mod: Günlük saat / Haftalık toplam (35, 40… hafta içi günlere /5) / Haftayı tamamla (çalışılan saat + tatil = hedef, örn. 30+10=40). Vardiyalı ve hafta sonu günleri atlanır; aralıktaki eski tatil kayıtları tombstone ile değiştirilir (`vacPlan`). Önizlemede toplam saat, brüt ödeme ve son bordroya göre kalan tatil bakiyesi (`vacBalTxt`, aşarsa kırmızı). Tatil saatleri normal ücretle ödenir, tatil parası kesilmez.
  3. **Tatil bitti:** Son tatil günü geçtiyse ve o haftadan sonra PDF bordro yoksa hero'da "Tatilin bitti görünüyor… yeni gelecek bordronu ekle" + Worker push (`ve` alanı, tatil bitişinin 1–2 gün sonrası, kullanıcının bildirim saatinde, tek sefer). Bakiye her yeni (daha güncel) bordroyla `ytd.vacBal` üzerinden güncellenir.
- **Test:** vacPlan (günlük 8 gün=64 sa, haftalık 40, tamamla 2 vardiya+3×8), bakiye, kayıt, tatil bitti bannerı, `ntfBody().ve`, Worker `due()` (ertesi gün 08:00 gönderir, 06:00/tekrar/5 gün sonra göndermez), konut senaryoları tarayıcıda doğrulandı.
- **Antigravity İçin Not (ZORUNLU):** `server/bildirim-worker.js` değişti → **canlı Worker'a Quick Edit ile yapıştırılmalı** (yeni secret yok). Yapılmazsa "Tatilin bitti" push gitmez, uygulama içi uyarı yine çalışır.

---

## v45 (`2026-11-21-shiftpay-v45`) — **Claude Pro** — Kontrol listesi eklentileri
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı (v44 listesi korunarak):**
  1. **📄 Son bordromdan getir** butonu (liste ve haftalık hatırlatma içinde, PDF bordro varsa): `autoFromSlips(true)`; kullanıcının özel kira (kira girilmişse) ve "sigortayı kendim ödüyorum" seçimi korunur, `lock.housingMode/insMode` geri yazılır. Sonuç mesajı (`CHK_MSG`): neler güncellendi + "Bunlar bordrodan gelmez, şimdi kontrol et: kira tutarı/kapsamı, aylık sigorta, haftalık hedef".
  2. Maddelerde etiket: `(bordrodan)` / `(bordrodan gelmez, elle kontrol et)` (`manual`).
  3. **Eksik ayar uyarısı** (`chkMissing`, onaylanamaz, düzeltilince kaybolur): özel kira seçili + kira 0; aylık kira seçili + tutar 0; sigorta kendim + aylık tutar 0 → "Şimdi düzelt" ilgili sekmeyi açar.
  4. **Haftalık hatırlatma:** liste onaylıyken 7 günde bir kısa "🔁 Ayarların hâlâ doğru mu?" (`chkWeekOk` → `chk.wk`, `chkReopen` → listeyi yeniden açar). 28 gün / büyük fark kuralları aynen duruyor.
- **Test:** Eksik ayar, bordrodan getir (ücret güncellendi, seçimler korundu), haftalık hatırlatma ve kaybolma tarayıcıda doğrulandı.
- **Antigravity İçin Not:** Worker değişmedi.

---

## v44 (`2026-11-21-shiftpay-v44`) — **Claude Pro** — Ayar Kontrol Listesi
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı:**
  1. v43'teki 2 soruluk kurulum kartı yerine **"Bu ayarlar doğru mu?"** kontrol listesi (`chkItems`, `checklistHtml`, `chkMark`): konut (şirket evi/özel kira/aylık + tutar), sigorta (şirket/kendim + tutar), araç eki, saatlik ücret, diğer haftalık satırlar. Her madde ✓ Evet, doğru / ✕ Hayır, güncelle (ilgili Ayarlar sekmesini açar: `home`/`ded`/`pay`) + "Hepsi doğru". Onaylar `state.settings.chk` (bulutla eşitlenir).
  2. Tekrar sorma: tümü onaylanınca gizlenir; **28 günde bir** veya **büyük tahmin farkı çıkan yeni bir bordroda** (`slipGap` + `chk.ref`) yeniden gösterilir. Her açılışta sormuyor (kullanıcı yorulmasın diye).
  3. **Yol ücreti (özel evde kalanlar):** ayrı seçenek eklenmedi; bordrodaki `reis/woon-werk/kilometer/travel` içeren net satırlar artık ilk bordroda tekrar eden gelir olarak `custom`'a otomatik eklenir (önceden 2. bordroyu bekliyordu). Brüt bölümdeki yol satırları için otomatik ekleme yok → fark uyarısı devreye girer.
- **Test:** Liste, sekme açma (`ded`), Hepsi doğru, 28 gün sıfırlama ve `Reiskostenvergoeding` ilk bordroda tanıma tarayıcıda doğrulandı; açık/koyu tema OK.
- **Antigravity İçin Not:** Worker değişmedi.

---

## v43 (`2026-11-21-shiftpay-v43`) — **Claude Pro** — Doğruluk Rehberi
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı (Haftalık Plan › hero kartının üstü, `accuracyHtml()`):**
  1. **İlk açılış kurulumu:** `state.settings.setupOk` yoksa (yeni ve mevcut tüm kullanıcılarda bir kez) "Doğru hesap için 2 hızlı soru": Konut (şirket evi / kendi evim-özel kira) + Sigorta (bordrodan/şirket / kendim). Kaydet → `housingMode`, `insMode` yazılır, `lock.housingMode/insMode` ile bordro otomatiği bu seçimi ezmez, `setupOk=1` (bulutla eşitlenir, bir daha çıkmaz). Aylık kira (`monthly`) seçmiş kullanıcının ayarı "şirket evi" seçilirse korunur.
  2. **2 bordro uyarısı:** PDF bordro sayısı (`pdfSlipCount`) 2'den azsa "En iyi sonuç için en az 2 bordro yükle (n/2) — tatil ödeneği + tahmin doğruluğu" + Bordro ekle butonu; 2 ve üstünde kendiliğinden kaybolur.
  3. **Büyük fark uyarısı:** `slipGap(w)` = tahmin − bordro (park hariç). |fark| > max(30 €, bordronun %10'u) ise bordrolu haftada "Tahmin bu bordrodan €X farklı çıktı", bordrosuz haftada son bordroya göre "farklıydı; bu haftanın tahmini de sapabilir" + Ayarları kontrol et / Bordro ekle butonları.
- **Test:** Kurulum kaydı, 0/2 ve 1/2 bordro bannerı, 158 € fark uyarısı tarayıcıda doğrulandı; açık/koyu tema kontrast OK; TR/EN `L()` ile.
- **Antigravity İçin Not:** Worker değişmedi. (v42'deki Worker değişikliği canlıya yapıştırıldı mı kontrol et.)

---

## v42 (`2026-11-21-shiftpay-v42`) — **Claude Pro** — Güvenlik & Veri Koruma Paketi
- **Değişen Dosyalar:** `index.html`, `server/bildirim-worker.js`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md` (v41 Planbition düzeltmesi de bu sürümle birlikte yayınlanır).
- **Düzeltilenler:**
  1. **Planbition veri kaybı riski (v41):** Hafta yanıtı boş/hatalıysa mevcut planlı günler artık `off` yapılmaz (`weeksOk`); okunamayan hafta korunur ve kullanıcıya bildirilir.
  2. **Düz metin şifre/anahtar:** myHolland şifresi ve `OWNER_TOKEN` yetki anahtarı artık `localStorage`'da düz metin değil; `secPut/secGet/secInit` ile cihazdaki dışarı çıkarılamaz `CryptoKey` (IndexedDB, AES-256-GCM) ile şifreli saklanır. Eski düz metin kayıtlar açılışta otomatik şifrelenip silinir. myHolland şifre penceresi artık mevcut şifreyi önceden doldurmaz (boş bırakılırsa mevcut korunur). IndexedDB yoksa eski davranışa düşer.
  3. **Anahtar yarışı:** `pbDevKey` iki eşzamanlı şifrelemede iki ayrı anahtar üretebiliyordu (ilk şifre okunamaz hale gelirdi); tek `Promise` ile önbelleğe alındı.
  4. **Worker (`server/bildirim-worker.js`):** `POST /api/sync|off|test` artık Origin başlığı olmadan (curl) ve izinli olmayan Origin ile 403; isolate başına IP başına dakikada 30 istek sınırı (aşılınca 429, en-iyi-çaba).
- **Düzeltilemeyenler / kullanıcı veya ayrı iş gerektirenler:**
  - Repo hâlâ herkese açık (PC planı kodu, `watch.json`, mimari görünür) → GitHub'da Private yapılmalı (kullanıcı); eski `github.io` adresi bununla kapanır.
  - CSP'de `'unsafe-inline'` script duruyor → `index.html` içindeki satıriçi script'in ayrı dosyaya taşınıp nonce/hash'e geçmesi büyük refactor.
  - `innerHTML` (60+ kullanım) için tam `esc()` denetimi yapılmadı.
  - Eşitleme kodu kaybı/paylaşımı: kurtarma yok; kodu bilen herkes veriyi çözer (tasarım gereği).
  - Hız sınırı isolate-bellek tabanlı: dağıtık/kalıcı değil; `MAX_USERS=300` doldurma saldırısı tamamen kapanmadı (Cloudflare WAF kuralı önerilir).
  - Bordro/myHolland ve Planbition canlı uç testleri Claude ortamından yapılamaz (Cloudflare/Planbition erişimi yok).
- **Antigravity İçin Not (ZORUNLU):** `server/bildirim-worker.js` değişti → **canlı Worker'a Quick Edit ile yapıştırılmalı** (secret'lar aynı kalır, yeni secret gerekmez). `planbition_bot.py`: yalnızca bulunan vardiyaları işler, boş gün için `off` üretmez, bu yüzden v41 riski botta yok (önceki not düzeltildi).

---

## Geri Dönüş: 40 (2026-11-20-shiftpay-v40) — **Antigravity**
- **Durum:** Kullanıcı tercihiyle 41 (Fintech/Neo-Bank tasarım denemesi) geri alınarak ackup-v40 (4a2add5) sürümüne birebir dönüldü.
- **Not:** 40 dosyaları (index.html, ersion.json, sw.js, AI-CONTEXT.md) ackup-v40 yedeğinden eksiksiz geri yüklendi; tüm 39/40 Hızlı Hesap özellikleri ve önceki arayüz %100 korunuyor.

---

## v40 (`2026-11-20-shiftpay-v40`) — **Claude Pro**
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı:** PC Planı › Hızlı Hesap kartına "Normal paranı katmadan" bloğu eklendi: toplam para ayırdığı tutarı da içerir; `normal = toplam − ayırdığım`, PC önce ayrılan tutardan karşılanır, kalan fiyat normal paradan düşer ve "PC sonrası normal paran" gösterilir (toplam < ayırdığım ise uyarı). Çift dil `L()`, mevcut sınıflar; hesap motoruna dokunulmadı.
- **Test:** 3500 € toplam, 500 € ayrılan, 500 € PC → normal 3000 € kalır; 160.000 TL (≈2.884 €) → 2.384 € normal paradan gider, 616 € kalır.
- **Antigravity İçin Not:** Worker değişmedi.

---

## v39 (`2026-11-20-shiftpay-v39`) — **Claude Pro**
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `AI-CONTEXT.md`, `AI-HANDOFF.md`
- **Ne Yapıldı:**
  1. PC Planı › Sonuç sekmesine **🧮 Hızlı Hesap** kartı eklendi (`pcQuick`, `renderPcQuick`, `pcQuickOut`): sahibin elle yazdığı "Şu anki toplam param (€)", "PC fiyatı (TL)" ve iki haftalık birikim tutarı (varsayılan 300/500 €) ile "Ayırdığımla / toplam param ile alırsam cebinde kalan ya da eksik", her haftalık tutar için bitiş tarihi + hedef tarihe yetişme durumu ve hedef tarih için gereken haftalık tutar hesaplanır.
  2. Veriler `state.pc.q` içinde durur (şifreli PC kasasıyla eşitlenir, ana veriye girmez). Mevcut PC planı hesaplarına ve `pcCompute()`'a dokunulmadı; sadece `pcCompute().wk.use` okunur (haftalık net ortalamayı aşan birikim uyarısı için).
  3. Yeni metinler `L(tr, en)` ile çift dilli, mevcut `.field/.pcw/.ok/.bad` sınıflarıyla açık/koyu temada uyumlu. Kart yalnızca `isOwner()` PC planı içinde görünür.
- **Test:** Tarayıcıda doğrulandı (150.000 TL, 1 € = 55,5 TL, ayrılan 1000 € → 300 €/hf = 6 hafta = 1 Oca 2027, 500 €/hf = 4 hafta; hedef 28 Şub için 114 €/hf).
- **Antigravity İçin Not:** Worker değişmedi, canlı Worker'a bir şey yapıştırmak gerekmez.

---

## v38 (`2026-11-20-shiftpay-v38`) — **Antigravity**
- **Değişen Dosyalar:** `index.html`, `version.json`, `sw.js`, `_headers`, `.github/workflows/deploy-cloudflare.yml`, `AI-CONTEXT.md`, `AI-HANDOFF.md`, `README.md`
- **Ne Yapıldı (Teknik Hijyen + UI & Metin Restorasyonu):**
  1. **Satır Sonu Temizliği:** `index.html` (12.398 → ~6.220 satır), `sw.js` (84 → 42 satır) ve dokümanlardaki çift satır sonu (`\r\n\r\n`) şişmesi temiz LF'ye normalize edildi.
  2. **DevOps & Güvenlik Kapısı (`deploy-cloudflare.yml` + `_headers`):** `dist/` içinden `server/` ve `.md` dosyaları çıkarıldı, `|| true` kaldırıldı, genişletilmiş gizli anahtar taraması, **Pre-Deploy `calcPay()` Maaş Formülü Regresyon Testi**, **Post-Deploy Canlı `version.json` Smoke Testi** ve Cloudflare Pages `_headers` güvenlik başlıkları eklendi.
  3. **UI & Metin Restorasyonu:** Tüm kart başlıkları tek tip modern ikonlu Title Case'e geçirildi (`📅 Günlük Vardiyalar`, `🎯 Haftalık Hedef`, `🧾 Maaş Dökümü`, `📊 Aylık Özet`, `⚙️ Bütçe & Hedef Bilgilerim`, `💳 Sabit Gelir & Giderlerim`) + tam `I18N_EN` çevirisi eklendi; sayfa altı 3 dağınık paragraf tek şık `.app-footer` bloğunda toplandı (`pcSecret` 5-tık korundu); hafif `140ms` sekme geçişleri ve açık/koyu tema kart derinliği cilalandı.
- **Claude İçin Not:** Claude'un `v37` sonrası önerdiği 4 temizlik maddesinin tamamı + maaş formülü testi + canlı smoke test + `_headers` uygulandı.

---

## Canlı Sistem Kontrolü (`2026-11-20 02:20` · `v37`) — **Antigravity**
- **Canlı Web (Cloudflare Pages):** `version.json` = `2026-11-20-shiftpay-v37` (`200 OK`), `sw.js` güncel, `watch.json` (102 sistem), `watch.enc.json` (`200 OK`).
- **Canlı Worker (`summer-mode-6176`):** `GET /` (`200`), `/api/pc-watch` (`200`, canlı kur `55,47 ₺`). Güvenlik testleri 6/6 geçti: anahtarsız veya yanlış anahtarlı `/api/myholland-slips` ve `/api/planbition` istekleri **`403 Red`**, geçerli `OWNER_TOKEN` ile **`200 Yetkili`**.
- **Otomatik Test Kapısı (`deploy-cloudflare.yml` · commit `8dfa6ba`):** Her `main` commit'inde V8 JS sözdizimi (`node --check`), sürüm uyumu, tekrarlı HTML ID, `I18N_EN` JSON ve gizli anahtar sızıntısı kontrol edilir; hata varsa yayın durur, temizse ~20 sn'de Cloudflare Pages'e yayınlanır (Run #8 `Success`).
- **Yerel Saatlik Bot (`sync.log`):** Yeni eşitleme koduyla `2026-11-20 02:11`'de hatasız tamamlandı.
- **Claude İçin Not:** Tüm canlı sistem, güvenlik ve otomasyon katmanları Antigravity tarafından doğrulandı (`0 hata`). `README.md` de bu özetle güncellendi.

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


# ShiftPay — Evrensel Yapay Zeka (Claude / GPT / Gemini / Antigravity) Mimari & Oto-Güncelleme Rehberi



- **Proje Adı:** ShiftPay (`2026-11-20-shiftpay-v37`)

- **Canlı Web (Cloudflare Pages):** https://shiftpay-app.pages.dev/

- **Tek Doğru Kaynak (GitHub Single Source of Truth):** https://github.com/okanozgur16/maas-takip (`main` dalı)

- **Geri Dönüş (Rollback) Dalı:** `backup-pre-v19`



---



## 🚨 YAPAY ZEKA İÇİN ZORUNLU OTO-KODLAMA VE GÜNCELLEME KURALLARI

*(Kullanıcı sana her seferinde hatırlatmak zorunda kalmamalıdır; bu dosyayı okuyan her yapay zeka aşağıdaki 6 kuralı doğrudan ve eksiksiz uygular)*:



1. **EKSİKSİZ VE OTOMATİK KOD ÜRETİMİ:**

   - Kullanıcıya yarım kod, `// ...` ile kısaltılmış blok veya teorik açıklama verme.

   - Yaptığın her değişikliği doğrudan `index.html`, `sw.js`, `version.json` ve `automation/*.py` dosyalarına uygulanabilir **tam, hatasız ve kendi kendini güncelleyen kod blokları** olarak yaz.

   - GitHub ve Cloudflare Pages erişimin varsa doğrudan `main` dalına commit et ve `ShiftPay-Web.zip` paketini Cloudflare Pages'e deploy et.



2. **SÜRÜM SENKRONİZASYONU (SOURCE OF TRUTH):**

   - Her kod güncellemesinde `index.html` (`APP_VER`), `version.json` ve `sw.js` (`CACHE`) içindeki sürüm numarasını aynı anda bir üst sürüme (`v24`, `v25`...) yükselt.

   - Asla eski sürüm veya varsayım üzerinden gitme; her zaman GitHub `main` dalındaki son durumu baz al.



3. **GİZLİLİK VE ŞİFRELEME DOKUNULMAZLIĞI (`isOwner()`):**

   - Normal maaş kullanıcıları **Gizli PC Planını**, **Otomatik Bordro Çek (`mhAutoPull`)** butonunu ve **Yapay Zeka Köprüsünü (`copyAiCtx`)** ASLA görmemelidir.

   - `isOwner()` kontrolünü (`çift SHA-256 `OWNER_HASH` (ham Firestore doküman ID'si repoda tutulmaz)`), AES-256-GCM cihazlar arası eşitlemeyi (`sync`) ve PBKDF2-250k PC kasasını (`VAULT`) %100 koru.

   - `mergeStates()` içinde bordro zaman damgası (`slip.u`) korumasını asla bozma.



4. **ÇİFT ARAYÜZ, ÇİFT TEMA VE ÇİFT DİL UYUMU:**

   - Uygulama açılışta varsayılan olarak yeni **Kategori Tasarımı (`v2` — 🎯 Haftalık Plan, 🧾 Haftalık Döküm, 📈 Aylık, Yıllık & Birikim)** ile açılır; kullanıcı **Sıralamalı Tasarım (`classic`)** seçerse tercihi `localStorage` (`maas-takip-v1-ui-layout`) ve `state.ui.uiVer` içine kaydedilir.

   - Eklenen her özellik hem **Kategori Tasarımı** hem **Sıralamalı Tasarım**, hem **Açık (Beyaz)** hem **Koyu (Siyah)** tema, hem de **Türkçe** ve **İngilizce (`I18N_EN` / `L(tr, en)`)** dillerinde sıfır taşma ve sıfır eksik çeviri ile çalışmalıdır.

   - Kullanıcıya yönelik metinlerde ("Burayı oku" vb.) yapay zeka / AI / Claude gibi kavramlar kullanılmaz.



5. **SIFIR KOTA / SIFIR TOKEN OTOMASYON:**

   - Uygulama çalışma zamanında hiçbir ücretli AI/LLM API'sine ihtiyaç duymadan %100 saf JS (`selfHeal`) ve arka plan Python botlarıyla (`myholland_bot.py`, `gmail_bot.py`, `planbition_bot.py`, `pc_watch_bot.py`) çalışmalıdır.



6. **SEÇENEK SUNMA:**

   - Kritik tasarım veya işleyiş kararlarında tek bir dayatma yapmak yerine kullanıcıya A/B alternatifleri sun.



---



## 🔄 v34 Değişiklik Notları (2026-11-20)

- **Planbition çift vardiya düzeltmesi:** Planbition'dan al / otomatik çekim artık o gündeki eski Planbition kaydını (vardiya + izin) yenisiyle DEĞİŞTİRİR; eski id'ler `state.del` içine tombstone olarak yazılır (`pbRetire`), böylece bulut/diğer cihaz birleşiminde eski vardiya geri dirilmez.

- **Çakışma penceresi:** Planbition'a ait (kullanıcı düzenlemesi olmayan) değişen vardiyalar için artık onay penceresi çıkmaz; sadece kullanıcının kendi girdiği/düzenlediği kayıtlar korunur ve sorulur.

- **Onarım + bot:** `selfHeal` içinde aynı güne ait çift Planbition vardiyaları (ve vardiya olan günde `off`) kendiliğinden temizlenir; `automation/planbition_bot.py` aynı mantıkla (`merge_shifts`) gün başına tek kayıt tutar ve tombstone yazar.





## 🤝 ORTAK YAPAY ZEKA DEVİR PROTOKOLÜ (`AI-HANDOFF.md`)

- Her oturum başında önce **`AI-HANDOFF.md`** dosyasındaki son 3 kaydı oku (kimin ne yaptığını ve açık notları gör).

- Yaptığın her sürüm güncellemesinde (`v36`, `v37`...) **`AI-HANDOFF.md`** dosyasının en üstüne kendi adını (`Antigravity` veya `Claude Pro`), sürüm numarasını, değişen dosyaları ve diğer asistan için notları ekle.



## 🔄 v36 Değişiklik Notları (2026-11-20)

- **Sunucu yetkisi:** `/api/myholland-slips` ve `/api/planbition` yalnızca gizli `env.OWNER_TOKEN` ile açılır; `ownerHash` sadece arayüzde gizleme içindir.

- **Anahtar saklama:** Yetki anahtarı sahibe özel Ayarlar kutusundan (`🔑`) girilir, yalnızca cihaz `localStorage`'ında durur; repoya/`state`'e yazılmaz.

- **isOwner önbelleği:** Son başarılı hash sonucu `localStorage`'da tutulur, açılışta titreme olmaz.


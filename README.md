# Maaş Takip

Haftalık vardiya ve maaş takibi. **Hesap, e-posta ya da yapay zeka gerekmez.**

- Veriler (vardiyalar, bordro tutarları, ayarlar) kullanıcının kendi telefonunda/tarayıcısında saklanır.
- Bordro PDF'i telefonda okunur. Ad, adres, BSN, IBAN kaydedilmez.
- Eşitleme kapalıyken sayfa hiçbir dış siteye bağlanmaz. Bir kez açıldıktan sonra internetsiz de çalışır.
- **Cihazlar arası eşitleme (isteğe bağlı):** Ayarlar › Eşitleme. Veriler cihazdan çıkmadan önce kişiye özel 16 karakterlik kodla AES-256-GCM ile şifrelenir (anahtar: PBKDF2-SHA256, 150.000 tur). Sunucuda (Google Firestore, Avrupa) sadece okunamayan metin durur; belge adı kodun SHA-256 özetidir. Listeleme ve silme kuralla kapalıdır. Kodu bilmeyen veriyi ne bulabilir ne okuyabilir. Kod sızarsa Ayarlar › Eşitleme › "Kodu yenile" eski kodu kalıcı olarak iptal eder; "Eşitlemeyi sil" sunucudaki kopyayı temizler.
- Sayfa güvenlik politikası (CSP) ile sadece kendi dosyalarına ve Firestore'a bağlanabilir; API anahtarı sadece bu siteden ve sadece Firestore için çalışır.
- Telefon değişirse: eşitleme kodunu yeni cihaza gir ya da Ayarlar › Yedek › "Yedeği indir" / "Dosyadan geri yükle".

Kullanmak için: https://okanozgur16.github.io/maas-takip/

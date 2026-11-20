# ShiftPay · Vardiya ve Maaş Takibi (Wage & Shift Tracker)

Haftalık vardiya, saatlik ücret ve bordro takibi. **Hesap, e-posta ya da yapay zeka gerekmez.**

- **%100 Gizlilik:** Kişisel kimlik verileri (BSN, IBAN, ad, adres) asla kaydedilmez; tüm veriler kullanıcının kendi cihazında (`localStorage`) yerel olarak saklanır.
- **İstemci Taraflı PDF Okuma:** Bordro PDF'i tarayıcının kendi içinde yerel olarak çözümlenir, hiçbir sunucuya yüklenmez.
- **Hollanda Uitzendbureau Uyumluluğu:** Standart (%100), Gece/Haftasonu (%150), Fazla Mesai (%185), ADV saatlik ek ücreti, %8 Tatil Parası (Vakantiegeld), StiPP emeklilik kesintisi ve ET-regeling konaklama hesaplamaları dahildir.
- **İnternetsiz Çalışma (PWA):** Bir kez açıldıktan sonra Service Worker ile tamamen internetsiz çalışabilir.
- **Cihazlar Arası Eşitleme (İsteğe Bağlı):** Kişiye özel 16 haneli kod ile istemci tarafında AES-256-GCM ile uçtan uca şifrelenir.

## Yasal Uyarı / Disclaimer

ShiftPay bağımsız ve açık kaynaklı bir çalışan aracıdır; hiçbir ajans, istihdam bürosu (Carrière, Otto, Randstad vb.) veya işveren ile resmi bağlantısı veya ortaklığı yoktur. Uygulama yalnızca çalışanların vardiya ve tahmini net hak edişlerini kolayca takip edebilmeleri amacıyla geliştirilmiştir.

## Sürüm & Sistem Durumu

- **Aktif Sürüm:** `2026-11-20-shiftpay-v38` ([Canlı Uygulama](https://shiftpay-app.pages.dev/))
- **Otomatik Yayın & Test Kapısı:** Her `main` commit'inde GitHub Actions (`deploy-cloudflare.yml`) V8 JS sözdizimi, sürüm senkronizasyonu, tekrarlı ID ve gizli anahtar taraması yaparak Cloudflare Pages'e otomatik yayınlar.
- **Son Canlı Doğrulama (2026-11-20 02:20):** Web (`200 OK`), Worker (`200 OK` · yetkisiz istekler `403` kilitli), kod/çeviri bütünlüğü (`0 hata`) doğrulandı. Ayrıntılı sürüm ve geliştirici notları için bkz. [`AI-HANDOFF.md`](AI-HANDOFF.md).

# ShiftPay (Maaş Takip) — AI Context & Architecture Rules

- **Canlı URL:** https://shiftpay-app.pages.dev/
- **GitHub Repo:** https://github.com/okanozgur16/maas-takip
- **Güncel Sürüm:** 2026-11-18-shiftpay-v20

## Temel Mimari Kurallar
1. **Gizlilik & Şifreleme:** Tüm maaş/vardiya verileri cihazda (localStorage/IndexedDB) tutulur. Opsiyonel bulut eşitlemesi (Google Firestore, Avrupa) cihazdan çıkmadan önce **AES-256-GCM** (PBKDF2-SHA256) ile şifrelenir.
2. **Gizli PC Planı Kasası:** Web sürümünde varsayılan olarak gizlidir (5 dokunuşla açılır); maaş verilerinden bağımsız ayrı şifre ve AES-GCM ile korunur.
3. **Haftalık İş Akışı:**
   - **Salı gecesi:** myHolland üzerinden vardiya/çalışma verisi senkronizasyonu.
   - **Çarşamba:** Gmail üzerinden bordro PDF alımı ve cihaz içi ayrıştırma (kişisel kimlik/IBAN/BSN kaydedilmez).
4. **Planbition 3 Seçenekli Koruma:** Çakışma/senkronizasyon durumlarında veri kaybını önleyen 3 yönlü (3-way) koruma mekanizması.
5. **v20 Modülleri:** Akıllı arama (Smart Search), bölüm başlıkları, birikim (savings) modülü ve AI köprüsü.

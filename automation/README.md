# ShiftPay Background Sync Bots (`automation/`)

Bu klasör ShiftPay'in isteğe bağlı arka plan senkronizasyon botlarının **%100 gizli anahtarsız (sanitized)** kaynak kodlarını içerir:

- `run_sync.py`: Tek tık / zamanlanmış ana çalıştırıcı (`myHolland` -> `Gmail` -> `Planbition` sırasıyla).
- `myholland_bot.py`: Salı gecesi / erken düşen myHolland PDF bordrolarını çeker ve şifreli buluta yazar.
- `gmail_bot.py`: Çarşamba e-posta bordrolarını ve ek otopark (`Paid Parking` / `extraTravel`) bordrolarını birleştirir.
- `planbition_bot.py`: Planbition ESS gelecek vardiyalarını ve bölümlerini çeker (`merge_shifts` tombstone korumalı; geçmiş günlere ve `userEdited` kayıtlara asla dokunmaz).
- `pdf_parser.py`: Hollanda uitzendbureau PDF bordro ayrıştırıcı (web istemcisiyle birebir uyumlu).
- `sync_engine.py`: İstemci taraflı PBKDF2 + AES-256-GCM uçtan uca şifreli Firestore okuma/yazma motoru.
- `daemon.py`: Arka plan döngü zamanlayıcısı.
- `config.example.env`: Örnek ortam değişkeni şablonu (`config.env` gerçek şifre içerdiği için `.gitignore` ile hariç tutulur ve ASLA repoya eklenmez).

> **Not:** Web uygulamasının kendi içinde de (`index.html` + `server/bildirim-worker.js`) tarayıcıdan doğrudan çalışan canlı Planbition (`pbPull` -> `/api/planbition`) ve canlı myHolland (`mhAutoPull` -> `/api/myholland-slips`) uç noktaları mevcuttur; yerel bilgisayar kapalıyken bile web üzerinden tek tıkla çalışır.

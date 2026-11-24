"""
ShiftPay Hourly Background Daemon
Runs ShiftPay sync automatically every 1 hour in the background.
Zero AI quota consumption. Completely private and local.
"""

import time
import datetime
from run_sync import main as run_sync_main

INTERVAL_SECONDS = 3600 # 1 hour

def loop():
    print(f"[*] ShiftPay Saatlik Otomasyon Servisi Başlatıldı. (Her {INTERVAL_SECONDS // 60} dakikada bir çalışacak)")
    while True:
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n[>>>] Zamanlanmış kontrol başlıyor: {now_str}")
        try:
            run_sync_main()
        except Exception as e:
            print(f"[!] Otomasyon döngüsünde hata: {e}")
            
        print(f"[zzz] Bir sonraki kontrole kadar uyku moduna geçiliyor ({INTERVAL_SECONDS} saniye)...")
        time.sleep(INTERVAL_SECONDS)

if __name__ == '__main__':
    loop()

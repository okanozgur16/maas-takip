"""
ShiftPay One-Click & Scheduled Sync Runner
Reads config.env and triggers:
1. myHolland Tuesday Night / Early Payslip Sync (Primary)
2. Gmail Wednesday Email Payslip & Parking Allowance Sync (Fallback / Multi-slip merge)
3. Planbition ESS shift extraction (preserving past weeks & user-edited hours)
"""

import os
import sys
import logging
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

logging.getLogger("pypdf").setLevel(logging.ERROR)

ENV_PATH = Path(__file__).parent / "config.env"


def load_env():
    env = {}
    if not ENV_PATH.exists():
        return env
    with open(ENV_PATH, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env


def main():
    print("=" * 65)
    print("          ShiftPay Akilli Senkronizasyon Baslatiliyor          ")
    print("=" * 65)

    cfg = load_env()
    sync_code = cfg.get("SHIFTPAY_SYNC_CODE", "").strip()
    pb_user = cfg.get("PLANBITION_USERNAME", "").strip()
    pb_pass = cfg.get("PLANBITION_PASSWORD", "").strip()
    gmail_user = cfg.get("GMAIL_USER", "").strip()
    gmail_pass = cfg.get("GMAIL_APP_PASS", "").strip()
    mh_pass = (cfg.get("MYHOLLAND_PASSWORD") or pb_pass).strip()

    if not sync_code or "BURAYA" in sync_code:
        print("[!] Hata: Lutfen config.env dosyasindaki SHIFTPAY_SYNC_CODE alanini doldurun.")
        return

    # 1. Salı Gecesi Önceliği: myHolland Finans / Bordro Kontrolü
    if gmail_user and mh_pass:
        print(f"\n[1] myHolland ({gmail_user}) uzerinden Sali gecesi / yeni bordrolar kontrol ediliyor...")
        try:
            from myholland_bot import sync_myholland
            sync_myholland(gmail_user, mh_pass, sync_code)
        except Exception as e:
            print(f"[!] myHolland senkronizasyonunda hata: {e}")
    else:
        print("\n[-] myHolland sifresi (MYHOLLAND_PASSWORD) tanimli degil.")

    # 2. Çarşamba Mail Yedeği & Ek Otopark Bordrosu: Gmail Kontrolü
    if gmail_user and gmail_pass and "seninmailin" not in gmail_user:
        print(f"\n[2] Gmail ({gmail_user}) uzerinden Carsamba mail bordrolari ve park odenekleri kontrol ediliyor...")
        try:
            from gmail_bot import check_gmail_and_sync
            check_gmail_and_sync(gmail_user, gmail_pass, sync_code)
        except Exception as e:
            print(f"[!] Gmail senkronizasyonunda hata: {e}")
    else:
        print("\n[-] Gmail bilgileri eksik.")

    # 3. Planbition Vardiya ve Bölüm Kontrolü (Geçmiş Hafta & Elle Girilen Saat Korumalı)
    if pb_user and pb_pass and "kullanici_adin" not in pb_user:
        print(f"\n[3] Planbition ESS uzerinden gelecek vardiyalar taraniyor...")
        try:
            from planbition_bot import sync_planbition
            sync_planbition(pb_user, pb_pass, sync_code, customer="Carriere")
        except Exception as e:
            print(f"[!] Planbition senkronizasyonunda hata: {e}")
    else:
        print("\n[-] Planbition giris bilgileri eksik.")


    print("\n" + "=" * 65)
    print("Tamamlandi! Guncel durum icin: https://shiftpay-app.pages.dev")
    print("=" * 65)


if __name__ == "__main__":
    main()

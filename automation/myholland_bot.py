"""
ShiftPay myHolland (Finances) Live Downloader (Tuesday Night Priority)
Logs in to https://www.myholland.eu/login, queries AngularJS endpoints:
  - POST /finances/getFinancesData
  - POST /finances/getLoonsForWeek
  - GET  /finances/show/loon/{id}/{year}
Downloads any new/missing payslip PDFs as soon as they drop on Tuesday night,
parses them (including Paid Parking / extraTravel & YTD cumulative totals),
and merges them into ShiftPay without overwriting existing data.
"""

import sys
import requests
import re
import io
import time
import logging
from pdf_parser import parse_payslip_pdf_all, merge_slip
from sync_engine import ShiftPaySync

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

logging.getLogger("pypdf").setLevel(logging.ERROR)

BASE_URL = "https://www.myholland.eu"


def sync_myholland(email_addr: str, password: str, sync_code: str, min_date: str = "2026-08-01"):
    clean_email = email_addr.strip()
    clean_pass = password.strip()
    print(f"[*] myHolland ({clean_email}) girisi yapiliyor (Sali gecesi / erken bordro kontrolu)...")
    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    })

    login_page = session.get(f"{BASE_URL}/login", timeout=15)
    csrf_match = re.search(r'name="_token"\s+value="([^"]+)"', login_page.text)
    if not csrf_match:
        print("[!] myHolland CSRF token bulunamadi.")
        return []

    token = csrf_match.group(1)
    login_data = {
        "_token": token,
        "email": clean_email,
        "password": clean_pass,
        "remember": "1"
    }

    res = session.post(f"{BASE_URL}/login", data=login_data, timeout=15)
    if "logout" not in res.text.lower() and "/finances" not in res.url and "dashboard" not in res.url.lower():
        print("[!] myHolland giris basarisiz. Lutfen config.env icindeki MYHOLLAND_PASSWORD bilgisini kontrol et.")
        return []

    fin_res = session.get(f"{BASE_URL}/finances", timeout=15)
    csrf_meta = re.search(r'name="csrf-token"\s+content="([^"]+)"', fin_res.text)
    ajax_headers = {"X-Requested-With": "XMLHttpRequest"}
    if csrf_meta:
        ajax_headers["X-CSRF-TOKEN"] = csrf_meta.group(1)

    # 1. Fetch available years & weeks via AngularJS endpoint
    r_data = session.post(f"{BASE_URL}/finances/getFinancesData", headers=ajax_headers, timeout=15)
    if r_data.status_code != 200:
        print(f"[!] myHolland getFinancesData hatasi: HTTP {r_data.status_code}")
        return []

    try:
        fin_json = r_data.json()
    except Exception:
        print("[!] myHolland finans JSON verisi okunamadi.")
        return []

    sync = ShiftPaySync(sync_code)
    current_store = sync.get_data() or {}
    if "slips" not in current_store or not isinstance(current_store["slips"], dict):
        current_store["slips"] = {}
    if "ytd" not in current_store or not isinstance(current_store["ytd"], dict):
        current_store["ytd"] = {"asOf": "", "gross": 0, "tax": 0, "ins": 0, "vacBal": 0}

    # Collect existing slip numbers so we only download PDFs that are new or missing
    existing_nums = set()
    for ws_k, sl_v in current_store["slips"].items():
        if isinstance(sl_v, dict):
            if sl_v.get("num"):
                existing_nums.add((int(ws_k[:4]), int(sl_v["num"])))
            for pt in (sl_v.get("parts") or []):
                if isinstance(pt, dict) and pt.get("num"):
                    existing_nums.add((int(ws_k[:4]), int(pt["num"])))

    min_year = int(min_date[:4])
    all_parsed = []

    for year_entry in (fin_json.get("loons") or []):
        yr = int(year_entry.get("year") or 0)
        if yr < min_year:
            continue
        weeks = (year_entry.get("data") or {}).get("weeks") or []
        print(f"[+] myHolland {yr} yili bordro haftalari: {', '.join(str(w) for w in weeks)}")

        for wk in weeks:
            wk_int = int(wk)
            if yr == 2026 and wk_int < 32:
                continue
            try:
                r_wk = session.post(
                    f"{BASE_URL}/finances/getLoonsForWeek",
                    json={"year": yr, "week": str(wk)},
                    headers=ajax_headers,
                    timeout=15
                )
                loons_list = r_wk.json() if r_wk.status_code == 200 else []
            except Exception:
                loons_list = []

            for loon in (loons_list or []):
                loon_id = loon.get("id")
                loon_num = int(loon.get("loon_number") or 0)
                loon_yr = int(loon.get("loon_year") or yr)
                if not loon_id:
                    continue
                # Download if this settlement number is not yet stored
                if (loon_yr, loon_num) in existing_nums:
                    continue

                pdf_url = f"{BASE_URL}/finances/show/loon/{loon_id}/{loon_yr}"
                try:
                    r_pdf = session.get(pdf_url, timeout=20)
                    if r_pdf.status_code == 200 and r_pdf.content[:4] == b"%PDF":
                        results = parse_payslip_pdf_all(io.BytesIO(r_pdf.content))
                        for r in results:
                            if r["ws"] >= min_date:
                                all_parsed.append(r)
                                print(f"    -> [YENI BORDRO INDIRILDI] Hafta {r['week']} ({r['ws']}, #{loon_num}): EUR {r['slip'].get('payable', 0):.2f}")
                except Exception as e:
                    print(f"    [!] Hafta {wk} (#{loon_num}) PDF indirme hatasi: {e}")

    if not all_parsed:
        print("[*] myHolland uzerindeki tum bordrolar zaten ShiftPay'de mevcut ve guncel.")
        return []

    all_parsed.sort(key=lambda r: (r["ws"], r["slip"].get("num") or 0))
    changes = 0
    weeks_updated = []
    latest_ytd = current_store["ytd"]

    now_ms = int(time.time() * 1000)
    if "del" in current_store and isinstance(current_store["del"], dict):
        for k_del in list(current_store["del"].keys()):
            if k_del.startswith("slip:"):
                del current_store["del"][k_del]

    for r in all_parsed:
        ws = r["ws"]
        old_slip = current_store["slips"].get(ws)
        merged = merge_slip(old_slip, r["slip"])
        merged["u"] = now_ms
        if "del" in current_store and isinstance(current_store["del"], dict):
            current_store["del"].pop(f"slip:{ws}", None)
        if merged != old_slip:
            current_store["slips"][ws] = merged
            changes += 1
            if merged.get("week") not in weeks_updated:
                weeks_updated.append(merged.get("week"))

        cum = r.get("cum") or {}
        if ws >= (latest_ytd.get("asOf") or "") and ("gross" in cum or "tax" in cum):
            latest_ytd = {
                "asOf": ws,
                "gross": cum.get("gross", latest_ytd.get("gross", 0)),
                "tax": cum.get("tax", latest_ytd.get("tax", 0)),
                "ins": cum.get("ins", latest_ytd.get("ins", 0)),
                "vacBal": cum.get("vacBal", latest_ytd.get("vacBal", 0)),
            }

    if changes > 0:
        current_store["ytd"] = latest_ytd
        current_store["updated"] = int(time.time() * 1000)
        sync.save_data(current_store)
        print(f"[BASARILI] myHolland uzerinden {changes} yeni bordro ({weeks_updated}) ShiftPay'e otomatik eklendi!")
    else:
        print("[*] myHolland bordrolari zaten ShiftPay ile birebir guncel.")

    return weeks_updated


if __name__ == "__main__":
    from run_sync import load_env
    cfg = load_env()
    mh_pass = cfg.get("MYHOLLAND_PASSWORD") or cfg.get("PLANBITION_PASSWORD", "")
    sync_myholland(cfg["GMAIL_USER"], mh_pass, cfg["SHIFTPAY_SYNC_CODE"])

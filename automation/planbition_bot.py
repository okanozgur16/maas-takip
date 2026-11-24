"""
ShiftPay Planbition ESS Live Sync
Connects to Planbition cloud API, fetches scheduled shifts and departments,
checks for shifts needing confirmation, and syncs planned hours to ShiftPay.
STRICT PROTECTION:
- Never modifies past weeks or past days (d < today).
- Never overwrites shifts manually entered or manually edited by the user (userEdited=True or not planbition).
"""

import sys
import requests
import json
import datetime
import time
import re
from sync_engine import ShiftPaySync

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

API_BASE = "https://planbition.herokuapp.com"
SPECIFIC_DEPTS = {"HB Fullen", "HB Coel", "HB Picken", "Emballage", "Bulk Sircuid"}


def normalize_dept(day: dict) -> str:
    """Planbition'da ne yaziyorsa aynen alir (orn. 'Picken HB · 2. PA')."""
    def clean(v):
        v = re.sub(r"\s+", " ", v).strip() if isinstance(v, str) else ""
        return "" if v == "-" else v
    n1, n2 = clean(day.get("ScheduledName1")), clean(day.get("ScheduledName2"))
    if n1 or n2:
        return " · ".join(x for x in (n1, n2) if x)[:40]
    for k in ("ScheduledFunctionName", "FunctionName", "SkillName", "TaskName", "ActivityName", "ShiftName"):
        v = clean(day.get(k))
        if v:
            return v[:40]
    return clean(day.get("CustomerStructureName")) or "Houdbaar"


def merge_shifts(state, shifts_found, today_iso, now_ms):
    """Planbition vardiyalarini state'e isler. Ayni gunde eski Planbition kaydi varsa
    YENISIYLE DEGISTIRIR (eski id'ler silinmis sayilir -> bulutta/diger cihazda geri gelmez).
    Kullanicinin kendi girdigi/duzenledigi kayitlara dokunmaz."""
    state.setdefault("del", {})
    changes_made = 0

    by_date = {}
    for e in state["entries"]:
        by_date.setdefault(e["date"], []).append(e)

    for s in shifts_found:
        d = s["date"]
        # STRICT RULE: Never overwrite past days or finished shifts
        if d < today_iso:
            continue

        hour = int(s["start"].split(":")[0])
        sh_type = "morning" if hour < 12 else "late"
        dept = s.get("department") or "Houdbaar"
        sh_id = f"pb_{d.replace('-', '')}_{'m' if hour < 12 else 'l'}"

        day_entries = by_date.get(d, [])
        # STRICT RULE: kullanicinin elle girdigi / duzenledigi kayit varsa arka plan esitlemesi dokunmaz
        user_owned = [
            e for e in day_entries
            if e.get("userEdited") or (e.get("type") in ("shift", "manual", "vacation") and not e.get("planbition"))
        ]
        if user_owned:
            o = user_owned[0]
            print(f"    [KORUNDU] {d} kullanicinin kendi girdigi kayit korundu ({o.get('start')}–{o.get('end')})")
            continue

        pb_old = [e for e in day_entries if e.get("planbition")]
        pb_shifts = [e for e in pb_old if e.get("type") == "shift"]
        pb_shifts.sort(key=lambda e: e.get("u") or 0, reverse=True)
        cur = pb_shifts[0] if pb_shifts else None

        old_dept = ((cur or {}).get("dept") or (cur or {}).get("tag") or "")
        target_dept = old_dept if (old_dept in SPECIFIC_DEPTS and dept == "Houdbaar") else dept

        if cur is not None and cur.get("planned", True) is False:
            continue

        unchanged = (
            cur is not None and len(pb_old) == 1 and cur.get("id") == sh_id and
            cur.get("start") == s["start"] and cur.get("end") == s["end"] and
            old_dept == target_dept and cur.get("shift") == sh_type
        )
        if unchanged:
            continue

        new_entry = {
            "id": sh_id,
            "date": d,
            "type": "shift",
            "shift": sh_type,
            "start": s["start"],
            "end": s["end"],
            "breakMin": 30,
            "planned": True,
            "driver": True,
            "dept": target_dept,
            "tag": target_dept,
            "planbition": True,
            "pbPending": (not s.get("confirmed", True)),
            "u": now_ms,
        }
        # eski Planbition kayitlarini (vardiya + off) kaldir, yenisini ekle
        for e in pb_old:
            if e["id"] != sh_id:
                state["del"][e["id"]] = now_ms
        state["del"].pop(sh_id, None)
        state["entries"] = [e for e in state["entries"] if not (e.get("planbition") and e["date"] == d)]
        state["entries"].append(new_entry)
        by_date[d] = [e for e in day_entries if not e.get("planbition")] + [new_entry]
        changes_made += 1
        if cur is None:
            print(f"    [YENI VARDIYA] {d}: {s['start']}–{s['end']} ({target_dept})")
        else:
            print(f"    [DEGISIKLIK] {d} vardiyasi degistirildi: {s['start']}–{s['end']} ({target_dept})")

    return changes_made


def sync_planbition(username: str, password: str, sync_code: str, customer: str = "Carriere"):
    print(f"[*] Planbition ESS ({customer}) baglantisi kuruluyor...")
    auth_payload = {
        "sCustomer": customer,
        "sUsername": username,
        "sPassword": password,
        "sLanguage": "en"
    }

    r = requests.post(f"{API_BASE}/soap/auth", json=auth_payload, timeout=12)
    r.raise_for_status()
    auth_data = r.json()

    if auth_data.get("AuthenticationSuccessful") != "true":
        err = auth_data.get("MobileUser", {}).get("MobileException", "Bilinmeyen giris hatasi")
        print(f"[!] Planbition Giris Basarisiz: {err}")
        return False

    user_info = auth_data.get("MobileUser", {})
    fullname = user_info.get("PersonFullname", username)
    person_guid = user_info.get("PersonGuid")
    db_name = auth_data.get("DatabaseName")
    server_url = auth_data.get("ServerURL")

    print(f"[+] Planbition Girisi Basarili! Calisan: {fullname}")

    confirm_url = f"{API_BASE}/soap/dashboard_confirm_shifts?serverURL={server_url}?wsdl&sDatabase={db_name}&lPersonID={person_guid}"
    try:
        c_res = requests.get(confirm_url, timeout=10).json()
        total_confirm = int(c_res.get("DashBoard_ConfirmShiftsResult", {}).get("TotalConfirm", 0))
        if total_confirm > 0:
            print(f"\n[!] [BILDIRIM] Planbition'da {total_confirm} adet ONAY BEKLEYEN yeni vardiyan var!")
        else:
            print("[+] Onay bekleyen vardiya yok.")
    except Exception as e:
        print(f"[!] Onay kontrolunde hata: {e}")

    today = datetime.date.today()
    today_iso = today.isoformat()
    mon_this_week = today - datetime.timedelta(days=today.weekday())
    mon_next_week = mon_this_week + datetime.timedelta(days=7)

    shifts_found = []

    for mon_date in [mon_this_week, mon_next_week]:
        iso_str = mon_date.strftime("%Y-%m-%d")
        week_url = f"{API_BASE}/soap/schedule_show_week?serverURL={server_url}?wsdl&sDatabase={db_name}&lPersonID={person_guid}&dtDayOfWeek={iso_str}"
        try:
            w_res = requests.get(week_url, timeout=12).json()
            days = w_res.get("Schedule_ShowWeekResult", {}).get("ScheduleDay", [])
            if not isinstance(days, list):
                days = [days]
            for day in days:
                if not isinstance(day, dict):
                    continue
                d_date = day.get("ScheduledDate", "").split("T")[0]
                s_time = day.get("ScheduledStartTime", "")
                e_time = day.get("ScheduledEndTime", "")
                dept = normalize_dept(day)
                is_conf = day.get("IsConfirmed") == "true"

                if s_time and e_time and "0001-01-01" not in s_time:
                    s_hm = s_time.split("T")[1][:5]
                    e_hm = e_time.split("T")[1][:5]
                    shifts_found.append({
                        "date": d_date,
                        "start": s_hm,
                        "end": e_hm,
                        "department": dept,
                        "confirmed": is_conf
                    })
        except Exception as e:
            print(f"[!] Hafta ({iso_str}) vardiyalarini cekerken hata: {e}")

    print(f"\n[+] Toplam {len(shifts_found)} adet planli vardiya tespit edildi:")
    for s in shifts_found:
        print(f"    - {s['date']} | {s['start']}–{s['end']} | Bolum: {s['department']} | Onayli: {s['confirmed']}")

    sync = ShiftPaySync(sync_code)
    state = sync.get_data() or {}

    if "entries" not in state or not isinstance(state["entries"], list):
        state["entries"] = []

    state["entries"] = [
        e for e in state["entries"]
        if isinstance(e, dict) and e.get("id") and isinstance(e.get("date"), str) and re.match(r"^\d{4}-\d{2}-\d{2}$", e["date"])
    ]

    now_ms = int(time.time() * 1000)
    changes_made = merge_shifts(state, shifts_found, today_iso, now_ms)

    if changes_made:
        state["updated"] = now_ms
        print(f"\n[*] ShiftPay'e {changes_made} vardiya guncellenerek yukleniyor...")
        sync.save_data(state)
        print("[BASARILI] Planbition vardiyalarin ShiftPay'e esitlendi!")
    else:
        print("\n[*] Vardiyalarda yeni bir degisiklik yok, saatlerin guncel.")

    return True


if __name__ == "__main__":
    from run_sync import load_env
    cfg = load_env()
    sync_planbition(cfg["PLANBITION_USERNAME"], cfg["PLANBITION_PASSWORD"], cfg["SHIFTPAY_SYNC_CODE"])

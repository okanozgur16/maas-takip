"""
ShiftPay Gmail Automation Bot
Connects securely to Gmail via IMAP, finds Dutch payslip emails from Carrière / AH Bleiswijk,
downloads PDF attachments, extracts numbers with 100% parity (including Paid Parking / extraTravel),
merges multi-part weekly slips in chronological order, and syncs directly to ShiftPay.
"""

import sys
import imaplib
import email
from email.header import decode_header
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


def get_header_str(header_value):
    if not header_value:
        return ""
    decoded_parts = decode_header(header_value)
    text = ""
    for part, enc in decoded_parts:
        if isinstance(part, bytes):
            text += part.decode(enc or 'utf-8', errors='ignore')
        else:
            text += str(part)
    return text


def check_gmail_and_sync(gmail_user: str, gmail_app_pass: str, sync_code: str, min_date: str = "2026-08-01"):
    clean_user = gmail_user.strip()
    clean_pass = gmail_app_pass.replace(' ', '').replace('-', '').strip()

    print(f"[*] Connecting to imap.gmail.com for {clean_user}...")
    mail = imaplib.IMAP4_SSL("imap.gmail.com")
    mail.login(clean_user, clean_pass)
    mail.select("INBOX")

    print("[*] Searching for payslip emails...")
    typ, data = mail.search(None, '(OR SUBJECT "Loonspecificatie" (OR FROM "carriere" SUBJECT "Carriere"))')
    mail_ids = data[0].split()

    if not mail_ids:
        print("[-] No matching payslip emails found.")
        mail.close()
        mail.logout()
        return []

    print(f"[+] Found {len(mail_ids)} matching email(s). Extracting payslip PDFs...")
    sync = ShiftPaySync(sync_code)
    current_store = sync.get_data() or {}

    if 'slips' not in current_store or not isinstance(current_store['slips'], dict):
        current_store['slips'] = {}
    if 'entries' not in current_store or not isinstance(current_store['entries'], list):
        current_store['entries'] = []
    if 'settings' not in current_store or not isinstance(current_store['settings'], dict):
        current_store['settings'] = {}
    if 'ytd' not in current_store or not isinstance(current_store['ytd'], dict):
        current_store['ytd'] = {'asOf': '', 'gross': 0, 'tax': 0, 'ins': 0, 'vacBal': 0}

    # Clean out pre-2026-08-01 slips if any were accidentally added earlier
    for old_k in list(current_store['slips'].keys()):
        if not isinstance(old_k, str) or old_k < min_date:
            del current_store['slips'][old_k]

    all_parsed = []

    # Process in chronological order (oldest email to newest email)
    for m_id in mail_ids:
        typ, msg_data = mail.fetch(m_id, "(RFC822)")
        for response_part in msg_data:
            if isinstance(response_part, tuple):
                msg = email.message_from_bytes(response_part[1])
                subject = get_header_str(msg.get("Subject"))

                for part in msg.walk():
                    filename = part.get_filename()
                    if filename and filename.lower().endswith(".pdf"):
                        pdf_data = part.get_payload(decode=True)
                        if not pdf_data:
                            continue
                        try:
                            results = parse_payslip_pdf_all(io.BytesIO(pdf_data))
                        except Exception:
                            continue
                        for r in results:
                            if r['ws'] >= min_date:
                                r['subject'] = subject
                                r['filename'] = filename
                                all_parsed.append(r)

    mail.close()
    mail.logout()

    if not all_parsed:
        print("[*] Yeni bir bordro bulunamadı.")
        return []

    # Sort strictly by week start (ws) and slip number (num) ascending so newer slips/add-ons merge on top of older ones!
    all_parsed.sort(key=lambda r: (r['ws'], r['slip'].get('num') or 0))

    # Rebuild slips for each week cleanly using merge_slip
    by_week = {}
    latest_ytd = current_store['ytd']
    for r in all_parsed:
        ws = r['ws']
        by_week[ws] = merge_slip(by_week.get(ws), r['slip'])
        cum = r.get('cum') or {}
        if ws >= (latest_ytd.get('asOf') or '') and ('gross' in cum or 'tax' in cum):
            latest_ytd = {
                'asOf': ws,
                'gross': cum.get('gross', latest_ytd.get('gross', 0)),
                'tax': cum.get('tax', latest_ytd.get('tax', 0)),
                'ins': cum.get('ins', latest_ytd.get('ins', 0)),
                'vacBal': cum.get('vacBal', latest_ytd.get('vacBal', 0)),
            }

    now_ms = int(time.time() * 1000)
    weeks_updated = []
    for ws in sorted(by_week.keys()):
        final_slip = by_week[ws]
        old_slip = current_store['slips'].get(ws)
        # Merge with any existing slip in store if it has parts, otherwise replace with our cleanly merged slip
        if old_slip and old_slip.get('parts'):
            final_slip = merge_slip(old_slip, final_slip)
        final_slip['u'] = now_ms
        if 'del' in current_store and isinstance(current_store['del'], dict):
            current_store['del'].pop(f'slip:{ws}', None)
        current_store['slips'][ws] = final_slip
        wk = final_slip['week']
        pk = (final_slip.get('lines') or {}).get('extraTravel') or 0
        payable = final_slip.get('payable') or 0
        norm = round(payable - pk, 2)
        pk_str = f" (Normal: €{norm:.2f} + Park: €{pk:.2f})" if pk > 0 else ""
        print(f"[OK] Hafta {wk:2d} ({ws}, #{final_slip.get('num', 0):2d}): Hesaba Yatan = €{payable:.2f}{pk_str}")
        if wk not in weeks_updated:
            weeks_updated.append(wk)

    current_store['ytd'] = latest_ytd
    current_store['updated'] = int(time.time() * 1000)

    print(f"\n[*] ShiftPay veritabanına yükleniyor ({len(weeks_updated)} hafta)...")
    sync.save_data(current_store)
    print("[BAŞARILI] Tüm bordrolar ve park ödenekleri ShiftPay'e şifreli olarak eşitlendi!")
    return weeks_updated


if __name__ == '__main__':
    from run_sync import load_env
    cfg = load_env()
    check_gmail_and_sync(cfg['GMAIL_USER'], cfg['GMAIL_APP_PASS'], cfg['SHIFTPAY_SYNC_CODE'])

"""
ShiftPay PDF Parser (100% Parity with Frontend parseSlipPages + mergeSlip + slipAutoNotes)
Extracts weekly payslip numbers from Dutch Uitzendbureau PDFs (Carrière, Easyflex, etc.)
Strict privacy: Never stores or extracts BSN, IBAN, names, or addresses.
"""

import re
import math
import datetime
import copy
from pypdf import PdfReader

SLIP_ROWS = [
    ('wN', re.compile(r'^Loon normale uren', re.I)),
    ('wO', re.compile(r'^Loon overwerkuren', re.I)),
    ('wI', re.compile(r'^Loon onregelmatige uren', re.I)),
    ('leer', re.compile(r'^Leeruren', re.I)),
    ('vacPay', re.compile(r'^Vakantiedagen', re.I)),
    ('vacGeld', re.compile(r'^Vakantiegeld', re.I)),
    ('advPay', re.compile(r'^Belaste ADV-toeslag', re.I)),
    ('pensComp', re.compile(r'^Pensioencompensatie', re.I)),
    ('housingGross', re.compile(r'^ET-uitruil huisvesting', re.I)),
    ('gross', re.compile(r'^Totaal bruto loon', re.I)),
    ('paww', re.compile(r'^PAWW', re.I)),
    ('azv', re.compile(r'^Premie AZV', re.I)),
    ('stipp', re.compile(r'^StiPP', re.I)),
    ('wia', re.compile(r'^WIA-hiaat', re.I)),
    ('lbT', re.compile(r'^Loonheffingen \(Week wit\)', re.I)),
    ('lbB', re.compile(r'^Loonheffingen \(bijz', re.I)),
    ('whk', re.compile(r'^Gediff\. premie Whk', re.I)),
    ('netLoon', re.compile(r'^Netto loon', re.I)),
    ('housingNet', re.compile(r'^(Inhouding|Vergoeding) ET-uitruil huisvesting', re.I)),
    ('driver', re.compile(r'^Chauffeursvergoeding', re.I)),
    ('utilities', re.compile(r'^Inhouding nutsvoorzieningen', re.I)),
    ('insurance', re.compile(r'^Inhouding verzekeringen', re.I)),
    ('extraIns', re.compile(r'^Inhoudinge aanvullende verzekering', re.I)),
    ('extraTravel', re.compile(r'^(Tijdelijke extra reiskosten|Paid Parking|Parkeerkosten|Parkeervergoeding|Vergoeding parkeren)', re.I)),
    ('payable', re.compile(r'^Netto te betalen', re.I)),
]

SLIP_NEG = {'housingGross', 'paww', 'azv', 'stipp', 'wia', 'lbT', 'lbB', 'whk', 'housingNet', 'utilities', 'insurance', 'extraIns'}

ALL_LINE_KEYS = [
    'wN', 'wI', 'wO', 'leer', 'vacPay', 'vacGeld', 'advPay', 'pensComp',
    'housingGross', 'gross', 'paww', 'azv', 'stipp', 'wia', 'lbT', 'lbB',
    'whk', 'netLoon', 'housingNet', 'driver', 'utilities', 'insurance',
    'extraIns', 'extraTravel'
]


def r2(x: float) -> float:
    return round((x + 1e-12) * 100) / 100


def week_start(iso_str: str) -> str:
    d = datetime.date.fromisoformat(iso_str)
    mon = d - datetime.timedelta(days=d.weekday())
    return mon.isoformat()


def iso_week_of(iso_str: str) -> int:
    d = datetime.date.fromisoformat(iso_str)
    return d.isocalendar()[1]


def slip_nums(s: str):
    cleaned = re.sub(r'\d+,\d{3,}%', '', s)
    matches = re.findall(r'-?\d{1,3}(?:\.\d{3})*,\d{2}(?!\d)|-?\d+,\d{2}(?!\d)', cleaned)
    return [float(m.replace('.', '').replace(',', '.')) for m in matches]


def slip_safe(t: str) -> bool:
    t = str(t or '')
    if re.search(r'(IBAN|BSN|burgerservice|sofinummer|geboorte|adres|straat|postcode|woonplaats|rekening|personeelsnummer|dossier|@|\bNL\d{2}[A-Z]{4})', t, re.I):
        return False
    if re.search(r'\d{5,}', t):
        return False
    return True


def slip_clean(t: str) -> str:
    t = re.sub(r'\d{4,}', '', str(t or ''))
    return re.sub(r'\s+', ' ', t).strip()


def corr_tr(name: str) -> str:
    n = str(name or '')
    if re.search(r'huisvesting', n, re.I):
        return 'kira'
    if re.search(r'nutsvoorz', n, re.I):
        return 'su-elektrik'
    if re.search(r'aanvull', n, re.I):
        return 'ek sigorta'
    if re.search(r'verzekering', n, re.I):
        return 'sigorta'
    if re.search(r'reiskost', n, re.I):
        return 'yol masrafı'
    if re.search(r'loon|uren', n, re.I):
        return 'ücret'
    return n


def slip_auto_notes(s: dict, driver_day: float = 5.0) -> list:
    L = s.get('lines') or {}
    n = []

    def f(v):
        return f"{abs(round(float(v or 0), 2)):.2f}".replace('.', ',')

    def sg(v):
        return ('−€' if v < 0 else '+€') + f(v)

    if L.get('extraTravel'):
        n.append(f"Geçici ek yol masrafı (park) +€{f(L['extraTravel'])} yattı.")
    if L.get('leer'):
        n.append(f"Eğitim saatleri (Leeruren) €{f(L['leer'])} yattı.")
    if L.get('extraIns'):
        n.append(f"Ek sigorta kesintisi −€{f(L['extraIns'])} kesildi.")

    hrs = s.get('hours') or {}
    worked = (hrs.get('norm', 0) + hrs.get('irr', 0) + hrs.get('over', 0)) > 0
    drv = L.get('driver', 0) or 0
    if drv > 0:
        nd = drv / driver_day if driver_day else 0
        if abs(nd - round(nd)) < 0.01:
            n.append(f"Araç eki: {round(nd)} gün × €{f(driver_day)} = €{f(drv)}.")
        else:
            n.append(f"Araç eki €{f(drv)} yattı.")

    corr_list = s.get('corr') or []
    if corr_list:
        grp = {'Correctie': [], 'Verrekening': []}
        for c in corr_list:
            m = re.match(r'^(Correctie|Verrekening) WAS\s+(.*?)\s*(-?[\d.]+)?$', c)
            if not m:
                continue
            amt = float(m.group(3)) if m.group(3) is not None else None
            grp[m.group(1)].append({'n': corr_tr(m.group(2)), 'a': amt})
        for key, label in [
            ('Correctie', 'Düzeltme satırları'),
            ('Verrekening', 'Mahsup satırları (önceki bordrodaki farkın kapatılması)')
        ]:
            lst = grp[key]
            if not lst:
                continue
            tot = 0.0
            ok = True
            for x in lst:
                if x['a'] is None:
                    ok = False
                else:
                    tot += x['a']
            items_str = ', '.join(x['n'] + ('' if x['a'] is None else ' ' + sg(x['a'])) for x in lst)
            tot_str = f" (toplam {sg(tot)})" if (ok and len(lst) > 1) else ''
            n.append(f"{label}: {items_str}{tot_str}.")

    for o in (s.get('other') or []):
        amt = o.get('a', 0)
        sec_note = ' (hesaba yatana dahil).' if o.get('s') == 'net' else ' (brüt/kesinti içinde).'
        n.append(f"Bordroda ek satır: “{o.get('l', '')}” {'−€' if amt < 0 else '+€'}{f(amt)}{sec_note}")

    parts = s.get('parts') or []
    if len(parts) > 1:
        p_str = ' + '.join(f"€{f(p['paid'])}" if p.get('paid') is not None else 'ödeme yok' for p in parts)
        pay_str = f" = €{f(s['payable'])} yattı" if s.get('payable') is not None else ''
        n.append(f"Bu hafta {len(parts)} ayrı bordro: {p_str}{pay_str}.")

    return n


def merge_slip(old: dict, nw: dict) -> dict:
    if not old or old.get('source') == 'elle' or not old.get('parts'):
        return nw
    old_parts = old.get('parts') or []
    nw_parts = nw.get('parts') or []
    parts = [p for p in old_parts if not any(q.get('num') == p.get('num') for q in nw_parts)] + nw_parts
    parts.sort(key=lambda x: x.get('num') or 0)

    def wages(x):
        L = x.get('lines') or {}
        return (L.get('wN') or 0) + (L.get('wI') or 0) + (L.get('wO') or 0) + (L.get('vacPay') or 0) + (L.get('leer') or 0)

    old_num = old.get('num') or 0
    nw_num = nw.get('num') or 0
    old_et = (old.get('lines') or {}).get('extraTravel') or 0
    nw_et = (nw.get('lines') or {}).get('extraTravel') or 0

    if wages(old) == 0 and wages(nw) > 0 and old_et > 0 and old_num > nw_num and not (old.get('corr')):
        base = copy.deepcopy(nw)
        adds0 = old.get('addOn') or [{
            'num': old_num,
            'extraTravel': old_et,
            'driver': (old.get('lines') or {}).get('driver') or 0,
            'payable': old.get('payable') or 0
        }]
        base['addOn'] = adds0
        base['parts'] = parts
        for a in adds0:
            base['lines']['extraTravel'] = r2((base['lines'].get('extraTravel') or 0) + a['extraTravel'])
            base['lines']['driver'] = r2((base['lines'].get('driver') or 0) + a['driver'])
            base['payable'] = base['lines']['payable'] = r2((base.get('payable') or 0) + a['payable'])
        notes = (old.get('notes') or []) + (nw.get('notes') or [])
        base['notes'] = list(dict.fromkeys(notes))
        return base

    max_num = max([q.get('num') or 0 for q in old_parts] + [old_num])
    if wages(nw) == 0 and wages(old) > 0 and nw_num > max_num and not (nw.get('corr')) and nw_et > 0:
        out = copy.deepcopy(old)
        for k in ('extraTravel', 'driver'):
            out['lines'][k] = r2((out['lines'].get(k) or 0) + ((nw.get('lines') or {}).get(k) or 0))
        out['payable'] = out['lines']['payable'] = r2((old.get('payable') or 0) + (nw.get('payable') or 0))
        out['other'] = (old.get('other') or []) + (nw.get('other') or [])
        out['corr'] = (old.get('corr') or []) + (nw.get('corr') or [])
        out['addOn'] = (old.get('addOn') or []) + [{
            'num': nw_num,
            'extraTravel': nw_et,
            'driver': (nw.get('lines') or {}).get('driver') or 0,
            'payable': nw.get('payable') or 0
        }]
        out['parts'] = parts
    elif wages(nw) == 0 and wages(old) > 0 and nw_et > 0 and any(q.get('num') == nw_num for q in old_parts):
        out = copy.deepcopy(old)
        out['parts'] = parts
    else:
        main = nw if nw_num >= old_num else old
        out = copy.deepcopy(main)
        out['parts'] = parts
        adds = [a for a in (old.get('addOn') or []) if a.get('num', 0) > (out.get('num') or 0)]
        if adds:
            out['addOn'] = adds
            for a in adds:
                out['lines']['extraTravel'] = r2((out['lines'].get('extraTravel') or 0) + a['extraTravel'])
                out['lines']['driver'] = r2((out['lines'].get('driver') or 0) + a['driver'])
                out['payable'] = out['lines']['payable'] = r2((out.get('payable') or 0) + a['payable'])

    keep = [x for x in (old.get('notes') or []) if not re.match(r'^Bu hafta \d+ ayrı bordro', x)]
    auto_n = slip_auto_notes(out)
    merged_notes = keep + [x for x in auto_n if x not in keep]
    out['notes'] = list(dict.fromkeys(merged_notes))
    return out


def parse_slip_pages(pages_lines: list):
    p1 = pages_lines[0] if len(pages_lines) > 0 else []
    p2 = pages_lines[1] if len(pages_lines) > 1 else []
    txt = '\n'.join(p1)
    warn = []

    m = re.search(r'Periode:\s*(\d\d)-(\d\d)-(\d{4})\s*t/m', txt)
    if not m:
        m = re.search(r'Periode:\s*(\d\d)-(\d\d)-(\d{4})', txt)
    if not m:
        return None, "Bordro dönemi bulunamadı."

    ws = week_start(f"{m.group(3)}-{m.group(2)}-{m.group(1)}")
    wk = re.search(r'Tijdvak:\s*Week\s*(\d+)', txt)
    nm = re.search(r'Nummer loonspecificatie\s*:\s*(\d+)', txt)
    dt = re.search(r'Datum verloning\s*:\s*(\d\d)-(\d\d)-(\d{4})', txt)

    ti = next((i for i, l in enumerate(p1) if re.match(r'^Omschrijving\b', l)), -1)
    if ti < 0:
        return None, "Bordro tablosu (Omschrijving) bulunamadı."

    rate = None
    for l in p1[:ti]:
        r_m = re.search(r'Loon\s+.+?\s+-?\d+:\d\d(?:\s+\S+\s+[\d,]+%)?\s+(\d+,\d\d)\s', l)
        if r_m and rate is None:
            rate = float(r_m.group(1).replace(',', '.'))
    if rate is None:
        m_min = re.search(r'Minimumuurloon:\s*€\s*(\d+,\d\d)', txt)
        if m_min:
            rate = float(m_min.group(1).replace(',', '.'))

    L = {}
    corr = []
    other = []
    sec = 'bruto'

    for l in p1[ti + 1:]:
        if re.match(r'^[-=]{5}', l):
            continue
        hit = False
        for k, pat in SLIP_ROWS:
            if pat.search(l):
                hit = True
                if k == 'gross':
                    sec = 'ded'
                elif k == 'netLoon':
                    sec = 'net'
                elif k == 'payable':
                    sec = 'end'

                if k == 'extraTravel' and k in L:
                    ns2 = slip_nums(l)
                    if ns2:
                        L[k] = r2(L[k] + ns2[-1])
                elif k not in L:
                    ns = slip_nums(l)
                    if k in SLIP_NEG:
                        neg = [x for x in ns if x < 0]
                        L[k] = abs(neg[-1]) if neg else 0.0
                    else:
                        L[k] = ns[-1] if ns else 0.0
                break
        if not hit:
            c = re.match(r'^(Correctie WAS|Verrekening WAS)\s+(.+?)\s+[-\d]', l)
            if c and slip_safe(c.group(2)):
                cn = slip_nums(l)
                corr.append(f"{c.group(1)} {slip_clean(c.group(2))} {cn[-1] if cn else ''}".strip())
            elif sec != 'end':
                on = slip_nums(l)
                lb = re.match(r'^([A-Za-zÀ-ÿ][^\d€]*?)\s+(?:-?\d|€)', l)
                if on and lb and not re.match(r'^(Totaal|Subtotaal|Omschrijving|Netto|Bruto|Fiscaal|Tarief|Uren|Aantal|Loon voor loonbelasting)\b', lb.group(1), re.I) and slip_safe(lb.group(1)):
                    other.append({'l': slip_clean(lb.group(1))[:48], 'a': on[-1], 's': sec})

    if 'payable' not in L:
        return None, "Netto te betalen satırı bulunamadı."

    for k in ALL_LINE_KEYS:
        if k not in L:
            L[k] = 0.0

    r_ = rate or 14.99
    min60 = lambda h: round(h * 60) / 60
    hours = {
        'norm': min60((L['wN'] + L['leer']) / r_),
        'irr': min60(L['wI'] / (1.5 * r_)),
        'over': min60(L['wO'] / (1.85 * r_)),
        'vac': min60(L['vacPay'] / r_)
    }

    cum = {}
    vac_acc = None
    paid_now = None
    to_h = lambda s: int(s.split(':')[0]) + int(s.split(':')[1]) / 60.0

    for l in p2:
        if re.match(r'^52 - Uitzendbedrijven', l):
            a = slip_nums(l)
            if a:
                cum['gross'] = a[0]
        elif re.match(r'^52 - \d', l):
            b = slip_nums(l)
            if len(b) >= 2:
                cum['tax'] = b[1]
        elif re.match(r'^Inhouding verzekeringen Z&Z', l):
            c = slip_nums(l)
            if c:
                cum['ins'] = c[0]
        elif re.match(r'^Vakantiedagen\b', l):
            hh = re.findall(r'\d+:\d\d', l)
            if len(hh) >= 5:
                vac_acc = to_h(hh[-4])
                cum['vacBal'] = to_h(hh[-1])
            elif len(hh) >= 1:
                vac_acc = 0.0
                cum['vacBal'] = to_h(hh[-1])
        pm = re.search(r'Te betalen\s*€\s*([\d.]+,\d\d)', l)
        if pm:
            p_nums = slip_nums(pm.group(1))
            if p_nums:
                paid_now = p_nums[0]

    slip_num = int(nm.group(1)) if nm else 0
    slip_date = f"{dt.group(3)}-{dt.group(2)}-{dt.group(1)}" if dt else ''
    slip = {
        'week': int(wk.group(1)) if wk else iso_week_of(ws),
        'source': 'pdf',
        'num': slip_num,
        'date': slip_date,
        'rate': r_,
        'hours': hours,
        'vacAccH': vac_acc,
        'lines': L,
        'payable': L['payable'],
        'corr': corr,
        'other': other,
        'parts': [{'num': slip_num, 'date': slip_date, 'paid': paid_now}]
    }
    slip['notes'] = slip_auto_notes(slip)

    return {
        'ws': ws,
        'week': slip['week'],
        'period_start': ws,
        'slip': slip,
        'data': slip,
        'cum': cum,
        'warn': warn
    }, None


def parse_payslip_pdf_all(pdf_path_or_bytes):
    """Returns list of parsed slip results from a PDF (handles multi-slip PDFs)."""
    reader = PdfReader(pdf_path_or_bytes)
    all_pages = []
    for pg in reader.pages:
        txt = pg.extract_text(extraction_mode='layout') or ''
        lines = [line.strip() for line in txt.split('\n') if line.strip()]
        all_pages.append(lines)

    starts = []
    for idx, p_lines in enumerate(all_pages):
        joined = '\n'.join(p_lines)
        if 'Periode:' in joined and any(re.match(r'^Omschrijving\b', l) for l in p_lines):
            starts.append(idx)

    if len(starts) <= 1:
        groups = [all_pages]
    else:
        groups = [
            all_pages[s0:(starts[i + 1] if i + 1 < len(starts) else len(all_pages))]
            for i, s0 in enumerate(starts)
        ]

    results = []
    for grp in groups:
        res, err = parse_slip_pages(grp)
        if res and not err:
            results.append(res)
    return results


def parse_payslip_pdf(pdf_path_or_bytes):
    results = parse_payslip_pdf_all(pdf_path_or_bytes)
    if not results:
        return None, "Bordro okunamadı."
    # If multiple slips in one PDF, merge them in order
    first = results[0]
    for r in results[1:]:
        if r['ws'] == first['ws']:
            first['slip'] = merge_slip(first['slip'], r['slip'])
            first['data'] = first['slip']
    return first, None

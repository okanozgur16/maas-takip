/* ShiftPay Bulut Bildirim & Otomasyon Sunucusu (Cloudflare Worker - %0 AI Token, 7/24 Aktif).
   Görevleri:
   1. Vardiya bildirimleri (/api/sync, /api/test, /api/off)
   2. Planbition canlı vardiya ve bölüm çekme + onay bekleyen vardiya bildirimi (/api/planbition)
   3. PC Planı (İtopya & Gaming.Gen.TR) canlı fiyat/stok kontrolü + kur bilgisi (/api/pc-watch)
   4. Arka plan zamanlayıcı (Cron): PC kapalıyken bile vardiya hatırlatmalarını, Planbition değişikliklerini ve PC fiyat indirimlerini kontrol edip telefona Push bildirim gönderir. */

const VAPID_PUBLIC = 'BNC8z6r6nw5KHuX-BHUvS_UtDme9G0J8InlDAtPo8mq38-Uz0ugRnoEia5FSJ5POcQOuuKW3IBDUl45T-WVCd_Y';
const SUBJECT = 'https://shiftpay-app.pages.dev/';
const PUSH_HOSTS = [/(^|\.)push\.apple\.com$/, /(^|\.)googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
const MAX_USERS = 300;
const PB_API = 'https://planbition.herokuapp.com';
const enc = new TextEncoder();

const b64u = {
  dec(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const r = atob(s), o = new Uint8Array(r.length); for (let i = 0; i < r.length; i++) o[i] = r.charCodeAt(i); return o; },
  enc(b) { b = new Uint8Array(b); let s = ''; for (const x of b) s += String.fromCharCode(x); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
};
const cat = (...a) => { const n = a.reduce((t, x) => t + x.length, 0), o = new Uint8Array(n); let p = 0; for (const x of a) { o.set(x, p); p += x.length; } return o; };

/* ---------- Web Push (RFC 8291 aes128gcm + VAPID) ---------- */
async function hkdf(ikm, salt, info, bits) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bits));
}
async function encryptPayload(sub, text) {
  const uaPub = b64u.dec(sub.keys.p256dh), auth = b64u.dec(sub.keys.auth);
  const asKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', asKeys.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeys.privateKey, 256));
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const ikm = await hkdf(secret, auth, cat(enc.encode('WebPush: info\0'), uaPub, asPub), 256);
  const cek = await hkdf(ikm, salt, enc.encode('Content-Encoding: aes128gcm\0'), 128);
  const nonce = await hkdf(ikm, salt, enc.encode('Content-Encoding: nonce\0'), 96);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, cat(enc.encode(text), new Uint8Array([2]))));
  const rs = new Uint8Array([0, 0, 16, 0]);
  return cat(salt, rs, new Uint8Array([65]), asPub, ct);
}
async function vapidHeader(endpoint, env) {
  const pub = b64u.dec(VAPID_PUBLIC);
  const jwk = { kty: 'EC', crv: 'P-256', x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), d: env.VAPID_PRIVATE.trim() };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64u.enc(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = b64u.enc(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUBJECT })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body)));
  return 'vapid t=' + head + '.' + body + '.' + b64u.enc(sig) + ', k=' + VAPID_PUBLIC;
}
async function sendPush(sub, payload, env) {
  const body = await encryptPayload(sub, JSON.stringify(payload));
  const r = await fetch(sub.endpoint, { method: 'POST', headers: { Authorization: await vapidHeader(sub.endpoint, env), 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', TTL: '7200', Urgency: 'normal' }, body });
  return r.status;
}

/* ---------- Doğrulama ---------- */
const okEndpoint = (e, env) => { try { const u = new URL(e); return u.protocol === 'https:' && (env.ALLOW_ANY === '1' || PUSH_HOSTS.some(r => r.test(u.hostname))); } catch (x) { return false; } };
const okId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{22,64}$/.test(id);
const okTz = tz => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return typeof tz === 'string' && tz.length < 64; } catch (e) { return false; } };
const rxD = /^\d{4}-\d{2}-\d{2}$/, rxDT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, rxT = /^([01]\d|2[0-3]):[0-5]\d$/;
function cleanSync(b, env) {
  if (!b || !okId(b.id) || !b.sub || !okEndpoint(b.sub.endpoint, env) || !b.sub.keys || typeof b.sub.keys.p256dh !== 'string' || typeof b.sub.keys.auth !== 'string') return null;
  if (b.sub.keys.p256dh.length > 100 || b.sub.keys.auth.length > 40 || b.sub.endpoint.length > 600 || !okTz(b.tz)) return null;
  const days = Array.isArray(b.days) ? [...new Set(b.days.map(Number).filter(n => n >= 0 && n <= 6))] : [1, 2, 3, 4, 5, 6];
  const plan = (Array.isArray(b.plan) ? b.plan : []).slice(0, 8).filter(p => p && rxD.test(p.d)).map(p => ({ d: p.d, s: p.s ? 1 : 0, e: typeof p.e === 'string' && rxDT.test(p.e) ? p.e : null, b: typeof p.b === 'string' && rxDT.test(p.b) ? p.b : null }));
  return { sub: { endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth } }, tz: b.tz, lang: b.lang === 'en' ? 'en' : 'tr', days, at: rxT.test(b.at) ? b.at : '07:00', rel: b.rel ? 1 : 0, plan, pcWatch: (b.pcWatch === 0 || b.pcWatch === false) ? 0 : 1, pcBudget: Number(b.pcBudget) || 0 };
}

/* ---------- Zaman ---------- */
function localNow(tz, ms) {
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms).replace(' ', 'T');
  return f.replace(/T24:/, 'T00:');
}
const addMin = (dt, m) => { const t = Date.UTC(+dt.slice(0, 4), +dt.slice(5, 7) - 1, +dt.slice(8, 10), +dt.slice(11, 13), +dt.slice(14, 16)) + m * 60000; return new Date(t).toISOString().slice(0, 16); };
const addDaysISO = (iso, n) => { const p = iso.split('-').map(Number); const d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)); return d.toISOString().slice(0, 10); };

/* ---------- Metinler ---------- */
const TXT = {
  tr: { a: ['Vardiyanı ayarla', 'Bugün için vardiya girilmemiş. Vardiyanı ayarla ki tahmin doğru çıksın.'], b: t => ['Vardiyan 1 saat sonra başlıyor', 'Planlanan vardiyan ' + t + ' gibi başlıyor. Saat değiştiyse uygulamada güncelle.'], e: t => ['Bu saatte mi çıktın?', 'Vardiyan ' + t + ' gibi bitiyordu. Gerçek çıkış saatini güncelle, tahmin doğru çıksın.'], t: ['Deneme bildirimi', 'ShiftPay vardiya ve fiyat bildirimleri aktif!'] },
  en: { a: ['Set your shift', 'No shift is set for today. Set it so your estimate stays accurate.'], b: t => ['Your shift starts in 1 hour', 'Your planned shift starts around ' + t + '. If the time changed, update it in the app.'], e: t => ['Did you leave at this time?', 'Your shift was due to end around ' + t + '. Update the real finishing time so your estimate stays accurate.'], t: ['Test notification', 'ShiftPay notifications are working!'] }
};

/* ---------- Karar ---------- */
function due(u, nowMs) {
  const now = localNow(u.tz, nowMs), today = now.slice(0, 10), out = [], sent = u.sent || {};
  const seen = u.up ? localNow(u.tz, u.up) : '';
  const t = u.plan.find(p => p.d === today);
  if (t && !t.s && u.days.includes(new Date(today + 'T12:00:00Z').getUTCDay())) {
    const from = today + 'T' + u.at, to = addMin(from, 360);
    if (now >= from && now <= to && !sent['a' + today] && !(seen && seen >= from)) out.push({ k: 'a' + today, kind: 'a' });
  }
  for (const p of u.plan) {
    if (u.rel && p.b) {
      const bf = addMin(p.b, -60);
      if (now >= bf && now < p.b && !sent['b' + p.b]) out.push({ k: 'b' + p.b, kind: 'b', t: p.b.slice(11) });
    }
    if (!p.e) continue;
    const from = addMin(p.e, u.rel ? 60 : 10), to = addMin(p.e, 240);
    if (now >= from && now <= to && !sent['e' + p.e] && !(seen && seen >= p.e)) out.push({ k: 'e' + p.e, kind: 'e', t: p.e.slice(11) });
  }
  return out;
}

/* ---------- Planbition Bulut Entegrasyonu (%0 Token) ---------- */
function normalizeDept(day) {
  const clean = (v) => { v = (typeof v === 'string') ? v.replace(/\s+/g, ' ').trim() : ''; return v === '-' ? '' : v; };
  const n1 = clean(day && day.ScheduledName1), n2 = clean(day && day.ScheduledName2);
  if (n1 || n2) return [n1, n2].filter(Boolean).join(' · ').slice(0, 40);
  for (const k of ['ScheduledFunctionName', 'FunctionName', 'SkillName', 'TaskName', 'ActivityName', 'ShiftName']) {
    const v = clean(day && day[k]); if (v) return v.slice(0, 40);
  }
  return clean(day && day.CustomerStructureName) || 'Houdbaar';
}

async function fetchPlanbitionSchedule(user, pass, customer, baseWeek) {
  const authRes = await fetch(PB_API + '/soap/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sCustomer: customer || 'Carriere', sUsername: user, sPassword: pass, sLanguage: 'en' })
  });
  const auth = await authRes.json();
  if (!auth || auth.AuthenticationSuccessful !== 'true') {
    const err = (auth && auth.MobileUser && auth.MobileUser.MobileException) || 'Planbition girişi başarısız.';
    return { ok: false, err };
  }
  const personGuid = auth.MobileUser.PersonGuid;
  const dbName = auth.DatabaseName;
  const serverUrl = auth.ServerURL;

  let totalConfirm = 0;
  try {
    const cUrl = `${PB_API}/soap/dashboard_confirm_shifts?serverURL=${encodeURIComponent(serverUrl + '?wsdl')}&sDatabase=${encodeURIComponent(dbName)}&lPersonID=${encodeURIComponent(personGuid)}`;
    const cRes = await fetch(cUrl).then(r => r.json());
    totalConfirm = parseInt((cRes && cRes.DashBoard_ConfirmShiftsResult && cRes.DashBoard_ConfirmShiftsResult.TotalConfirm) || '0', 10) || 0;
  } catch (e) {}

  const w1 = rxD.test(baseWeek || '') ? baseWeek : new Date().toISOString().slice(0, 10);
  const w2 = addDaysISO(w1, 7);
  const shifts = [];
  for (const wk of [w1, w2]) {
    try {
      const wUrl = `${PB_API}/soap/schedule_show_week?serverURL=${encodeURIComponent(serverUrl + '?wsdl')}&sDatabase=${encodeURIComponent(dbName)}&lPersonID=${encodeURIComponent(personGuid)}&dtDayOfWeek=${encodeURIComponent(wk)}`;
      const wRes = await fetch(wUrl).then(r => r.json());
      const days = (wRes && wRes.Schedule_ShowWeekResult && wRes.Schedule_ShowWeekResult.ScheduleDay) || [];
      for (const day of (Array.isArray(days) ? days : [days])) {
        if (!day || !day.ScheduledDate) continue;
        const dDate = String(day.ScheduledDate).split('T')[0];
        const sTime = String(day.ScheduledStartTime || '');
        const eTime = String(day.ScheduledEndTime || '');
        if (sTime && eTime && !sTime.includes('0001-01-01')) {
          const sHm = (sTime.split('T')[1] || '').slice(0, 5);
          const eHm = (eTime.split('T')[1] || '').slice(0, 5);
          if (rxT.test(sHm) && rxT.test(eHm)) {
            shifts.push({
              date: dDate,
              start: sHm,
              end: eHm,
              dept: normalizeDept(day),
              confirmed: day.IsConfirmed === 'true'
            });
          }
        }
      }
    } catch (e) {}
  }
  return { ok: true, shifts, totalConfirm, weeks: [w1, w2] };
}

/* ---------- İtopya & Gaming.Gen.TR Canlı Fiyat/Stok Çekici (%0 Token) ---------- */
function parsePriceTL(raw) {
  if (typeof raw === 'number') return raw > 1000 ? Math.round(raw) : 0;
  let s = String(raw || '').trim().replace(/[^\d.,]/g, '');
  if (!s) return 0;
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    const parts = s.split(',');
    if (parts[parts.length - 1].length === 2) s = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
    else s = s.replace(/,/g, '');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts[parts.length - 1].length === 3) s = s.replace(/\./g, '');
  }
  const n = Math.round(parseFloat(s));
  return n >= 15000 && n <= 500000 ? n : 0;
}

async function scrapeProductPage(url) {
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
      }
    });
    if (r.status === 404 || r.status === 410) return { ok: true, stock: 'yok', price: 0 };
    if (!r.ok) return { ok: false, status: r.status };
    const html = await r.text();

    let price = 0, stock = 'var';
    if (/Stokta Yok|Tükendi|Satış Dışı|Üretimden Kalktı/i.test(html) && !/Sepete Ekle|Hemen Al/i.test(html)) {
      stock = 'yok';
    }
    const ldMatches = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
    for (const block of ldMatches) {
      const inner = block.replace(/^<script[^>]*>|<\/script>$/gi, '').trim();
      try {
        const j = JSON.parse(inner);
        const nodes = Array.isArray(j) ? j : (j['@graph'] ? j['@graph'] : [j]);
        for (const node of nodes) {
          if (node && (node['@type'] === 'Product' || node.offers)) {
            const off = Array.isArray(node.offers) ? node.offers[0] : node.offers;
            if (off) {
              const p = parsePriceTL(off.price || off.lowPrice);
              if (p > 0) price = p;
              if (typeof off.availability === 'string' && /OutOfStock|SoldOut|Discontinued/i.test(off.availability)) stock = 'yok';
              if (typeof off.availability === 'string' && /InStock/i.test(off.availability)) stock = 'var';
            }
          }
        }
      } catch (e) {}
    }
    if (!price) {
      const metaP = html.match(/property=["'](?:product|og):price:amount["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/content=["']([^"']+)["']\s+property=["'](?:product|og):price:amount["']/i);
      if (metaP) price = parsePriceTL(metaP[1]);
    }
    if (!price) {
      const insM = html.match(/<ins[\s\S]{0,250}?([\d.]{5,10}(?:,\d{2})?)\s*(?:TL|₺)/i) ||
                   html.match(/class=["'][^"']*newPrice[^"']*["'][\s\S]{0,180}?([\d.]{5,10}(?:,\d{2})?)/i);
      if (insM) price = parsePriceTL(insM[1]);
    }
    return price > 0 ? { ok: true, price, stock } : { ok: false };
  } catch (e) {
    return { ok: false };
  }
}

/* ---------- Giriş noktaları ---------- */
const isAllowedOrigin = (origin, env) => {
  if (!origin) return true;
  if (env.ALLOWED_ORIGIN && origin === env.ALLOWED_ORIGIN) return true;
  return /^https:\/\/(okanozgur16\.github\.io|([a-z0-9-]+\.)?shiftpay(-app)?\.pages\.dev)$/i.test(origin);
};
const cors = (env, req) => {
  const origin = req && req.headers ? req.headers.get('Origin') : '';
  const allow = isAllowedOrigin(origin, env) ? (origin || 'https://shiftpay-app.pages.dev') : 'https://shiftpay-app.pages.dev';
  return { 'Access-Control-Allow-Origin': allow, 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
};
const json = (o, s, env, req) => new Response(JSON.stringify(o), { status: s || 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cors(env, req)) });

/* Sahip yetkisi: SADECE gizli Cloudflare secret'i env.OWNER_TOKEN ile (sabit zamanlı karşılaştırma). Repoda hiçbir yetki değeri yoktur. */
const ownerAuth = (b, env) => {
  const t = env.OWNER_TOKEN ? String(env.OWNER_TOKEN) : '';
  const g = (b && typeof b.ownerToken === 'string') ? b.ownerToken : '';
  if (!t || t.length < 16 || g.length !== t.length) return false;
  let d = 0;
  for (let i = 0; i < t.length; i++) d |= t.charCodeAt(i) ^ g.charCodeAt(i);
  return d === 0;
};

async function handle(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, req) });
  const url = new URL(req.url);
  if (req.method !== 'POST') return json({ ok: true, name: 'shiftpay-bildirim-ve-otomasyon' }, 200, env, req);
  const origin = req.headers.get('Origin');
  if (origin && !isAllowedOrigin(origin, env)) return json({ ok: false }, 403, env, req);
  const raw = await req.text(); if (raw.length > 65536) return json({ ok: false }, 413, env, req);
  let b; try { b = JSON.parse(raw); } catch (e) { return json({ ok: false }, 400, env, req); }

  /* 1. Planbition Canlı Vardiya Çekme Endpoint'i */
  if (url.pathname === '/api/planbition') {
    if (!ownerAuth(b, env)) return json({ ok: false, err: 'Yetkisiz erişim.' }, 403, env, req);
    let pbUser = (b && b.user) ? String(b.user).trim() : '';
    let pbPass = (b && b.pass) ? String(b.pass).trim() : '';
    const pbCust = (b && b.customer) ? String(b.customer).trim() : 'Carriere';
    if (!pbUser && env.PB_USER && env.PB_PASS) {
      pbUser = env.PB_USER;
      pbPass = env.PB_PASS;
    }
    if (!pbUser || !pbPass) return json({ ok: false, needCreds: true, err: 'Planbition kullanıcı adı ve şifresi gerekli.' }, 200, env, req);
    try {
      const res = await fetchPlanbitionSchedule(pbUser, pbPass, pbCust, b.week);
      return json(res, 200, env, req);
    } catch (e) {
      return json({ ok: false, err: 'Planbition sunucusuna ulaşılamadı.' }, 200, env, req);
    }
  }

  /* 1b. myHolland Canlı Bordro PDF Çekme Endpoint'i (Sadece Owner) */
  if (url.pathname === '/api/myholland-slips') {
    if (!ownerAuth(b, env)) return json({ ok: false, err: 'Yetkisiz erişim.' }, 403, env, req);
    let mhEmail = (b && b.email) ? String(b.email).trim() : (env.MH_EMAIL || '');
    let mhPass = (b && b.pass) ? String(b.pass).trim() : (env.MH_PASS || env.PB_PASS || '');
    if (!mhEmail || !mhPass) return json({ ok: false, needCreds: true, err: 'myHolland e-posta ve şifresi gerekli.' }, 200, env, req);
    try {
      const BASE = 'https://www.myholland.eu';
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
      const jar = {};
      const takeCookies = (res) => {
        const list = (typeof res.headers.getSetCookie === 'function')
          ? res.headers.getSetCookie()
          : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
        for (const c of list) {
          const m = /^([^=;,\s]+)=([^;]*)/.exec(c || '');
          if (m) jar[m[1]] = m[2];
        }
      };
      const cookieHeader = () => Object.keys(jar).map(k => k + '=' + jar[k]).join('; ');

      const rLoginGet = await fetch(BASE + '/login', { headers: { 'User-Agent': ua } });
      takeCookies(rLoginGet);
      const loginHtml = await rLoginGet.text();
      const tokM = /name="_token"\s+value="([^"]+)"/.exec(loginHtml);
      if (!tokM) return json({ ok: false, err: 'myHolland CSRF token alınamadı.' }, 200, env, req);

      const form = new URLSearchParams({ _token: tokM[1], email: mhEmail, password: mhPass, remember: '1' });
      const rLoginPost = await fetch(BASE + '/login', {
        method: 'POST',
        redirect: 'manual',
        headers: { 'User-Agent': ua, 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookieHeader(), 'Referer': BASE + '/login' },
        body: form.toString()
      });
      takeCookies(rLoginPost);

      const rFin = await fetch(BASE + '/finances', { headers: { 'User-Agent': ua, 'Cookie': cookieHeader() } });
      takeCookies(rFin);
      const finHtml = await rFin.text();
      if (/name="password"/i.test(finHtml) && !/logout/i.test(finHtml)) {
        return json({ ok: false, needCreds: true, err: 'myHolland giriş bilgileri hatalı.' }, 200, env, req);
      }
      const csrfM = /name="csrf-token"\s+content="([^"]+)"/.exec(finHtml);
      const ajaxHeaders = { 'User-Agent': ua, 'Cookie': cookieHeader(), 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' };
      if (csrfM) ajaxHeaders['X-CSRF-TOKEN'] = csrfM[1];

      const rData = await fetch(BASE + '/finances/getFinancesData', { method: 'POST', headers: ajaxHeaders });
      if (!rData.ok) return json({ ok: false, err: 'myHolland finans verisi alınamadı.' }, 200, env, req);
      const finJson = await rData.json();
      const haveSet = new Set(Array.isArray(b.existingNums) ? b.existingNums.map(String) : []);
      const pdfs = [];

      for (const yrEntry of (finJson.loons || [])) {
        const yr = Number(yrEntry.year || 0);
        if (yr < 2026) continue;
        const weeks = ((yrEntry.data || {}).weeks || []).slice(-6);
        for (const wk of weeks) {
          if (yr === 2026 && Number(wk) < 32) continue;
          const rWk = await fetch(BASE + '/finances/getLoonsForWeek', {
            method: 'POST',
            headers: ajaxHeaders,
            body: JSON.stringify({ year: yr, week: String(wk) })
          });
          if (!rWk.ok) continue;
          const loons = await rWk.json();
          for (const l of (Array.isArray(loons) ? loons : [])) {
            const lId = l.id, lNum = Number(l.loon_number || 0), lYr = Number(l.loon_year || yr);
            if (!lId || haveSet.has(lYr + ':' + lNum)) continue;
            const rPdf = await fetch(`${BASE}/finances/show/loon/${lId}/${lYr}`, { headers: { 'User-Agent': ua, 'Cookie': cookieHeader() } });
            if (rPdf.ok) {
              const buf = new Uint8Array(await rPdf.arrayBuffer());
              if (buf.length > 100 && buf[0] === 0x25 && buf[1] === 0x50) {
                let bin = '';
                for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
                pdfs.push({ week: Number(wk), num: lNum, year: lYr, name: `myHolland-W${wk}-${lNum}.pdf`, b64: btoa(bin) });
                if (pdfs.length >= 6) break;
              }
            }
          }
          if (pdfs.length >= 6) break;
        }
      }
      return json({ ok: true, pdfs }, 200, env, req);
    } catch (e) {
      return json({ ok: false, err: 'myHolland sunucusuna ulaşılamadı.' }, 200, env, req);
    }
  }

  /* 2. PC Planı (İtopya & Gaming.Gen.TR) Canlı Fiyat ve Kur Kontrolü Endpoint'i */
  if (url.pathname === '/api/pc-watch') {
    let eurRate = null;
    try {
      const er = await fetch('https://open.er-api.com/v6/latest/EUR').then(r => r.json());
      if (er && er.rates && er.rates.TRY) eurRate = Math.round(er.rates.TRY * 100) / 100;
    } catch (e) {}

    const items = Array.isArray(b && b.items) ? b.items.slice(0, 30) : [];
    if (items.length && env.KV) {
      try { await env.KV.put('pc:items', JSON.stringify(items.map(x => ({ id: x.id, name: x.name, url: x.url, price: x.price, stock: x.stock })))); } catch (e) {}
    }

    const force = !!(b && b.force);
    if (!force && env.KV) {
      try {
        const cached = await env.KV.get('pc:live', 'json');
        if (cached && cached.ts && Date.now() - cached.ts < 1800000) {
          return json({ ok: true, cached: true, checkedAt: cached.checkedAt, eurRate: eurRate || cached.eurRate, updates: cached.updates || {} }, 200, env, req);
        }
      } catch (e) {}
    }

    const updates = {};
    const toCheck = items.filter(x => x && x.id && typeof x.url === 'string' && /^https:\/\/(www\.)?(itopya\.com|gaming\.gen\.tr|gamegaraj\.com)\//i.test(x.url)).slice(0, 16);
    await Promise.all(toCheck.map(async (item) => {
      const r = await scrapeProductPage(item.url);
      if (r && r.ok) updates[item.id] = { price: r.price || item.price, stock: r.stock };
    }));

    const checkedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');
    if (env.KV && Object.keys(updates).length > 0) {
      try { await env.KV.put('pc:live', JSON.stringify({ ts: Date.now(), checkedAt, eurRate, updates })); } catch (e) {}
    }
    return json({ ok: true, checkedAt, eurRate, updates }, 200, env, req);
  }

  /* 3. PC Fiyat & Stok Anlık Bildirim Endpoint'i */
  if (url.pathname === '/api/pc-notify') {
    const title = (b && b.title) || 'ShiftPay · PC Fiyat Güncellemesi 🎯';
    const body = (b && b.body) || 'Takip ettiğin sistemlerde fiyat değişikliği var!';
    const tag = (b && b.tag) || 'pc-watch';
    let count = 0, cur = null;
    do {
      const list = await env.KV.list({ prefix: 'u:', cursor: cur });
      for (const k of list.keys) {
        const u = await env.KV.get(k.name, 'json');
        if (!u || !u.sub || u.pcWatch === 0) continue;
        try {
          const st = await sendPush(u.sub, { title, body, tag }, env);
          if (st >= 200 && st < 300) count++;
        } catch (e) {}
      }
      cur = list.list_complete ? null : list.cursor;
    } while (cur);
    return json({ ok: true, sent: count }, 200, env, req);
  }

  /* 4. Vardiya Bildirimleri Endpoint'leri */
  if (!b || !okId(b.id)) return json({ ok: false }, 400, env, req);
  const key = 'u:' + b.id;
  if (url.pathname === '/api/off') { await env.KV.delete(key); return json({ ok: true }, 200, env, req); }
  if (url.pathname === '/api/sync') {
    const c = cleanSync(b, env); if (!c) return json({ ok: false }, 400, env, req);
    const old = await env.KV.get(key, 'json');
    if (!old) { const l = await env.KV.list({ prefix: 'u:', limit: MAX_USERS + 1 }); if (l.keys.length >= MAX_USERS) return json({ ok: false, full: true }, 503, env, req); }
    const sent = old && old.sent ? old.sent : {};
    await env.KV.put(key, JSON.stringify(Object.assign(c, { sent, up: Date.now() })));
    return json({ ok: true }, 200, env, req);
  }
  if (url.pathname === '/api/test') {
    const u = await env.KV.get(key, 'json'); if (!u) return json({ ok: false }, 404, env, req);
    if (u.lt && Date.now() - u.lt < 30000) return json({ ok: false, wait: true }, 429, env, req);
    u.lt = Date.now(); await env.KV.put(key, JSON.stringify(u));
    const T = TXT[u.lang].t, st = await sendPush(u.sub, { title: T[0], body: T[1], tag: 'shift-t' }, env);
    return json({ ok: st >= 200 && st < 300, status: st }, 200, env, req);
  }
  return json({ ok: false }, 404, env, req);
}

async function scan(env, nowMs) {
  let cursor, n = 0, firstSub = null;
  do {
    const l = await env.KV.list({ prefix: 'u:', cursor });
    for (const k of l.keys) {
      const u = await env.KV.get(k.name, 'json'); if (!u || !u.sub) continue;
      if (!firstSub) firstSub = { key: k.name, u };
      if (nowMs - (u.up || 0) > 30 * 86400000) { await env.KV.delete(k.name); continue; }
      const todo = due(u, nowMs); if (!todo.length) continue;
      u.sent = u.sent || {};
      for (const x of todo) {
        const T = TXT[u.lang], m = x.kind === 'a' ? T.a : T[x.kind](x.t);
        let st = 0; try { st = await sendPush(u.sub, { title: m[0], body: m[1], tag: 'shift-' + x.kind }, env); } catch (e) {}
        if (st === 404 || st === 410) { await env.KV.delete(k.name); u.sent = null; break; }
        if (st >= 200 && st < 300) { u.sent[x.k] = 1; n++; }
      }
      if (u.sent) {
        const keep = {}, now = localNow(u.tz, nowMs).slice(0, 10), min = addMin(now + 'T00:00', -3 * 1440).slice(0, 10);
        for (const s of Object.keys(u.sent)) if (s.slice(1, 11) >= min) keep[s] = 1;
        u.sent = keep; await env.KV.put(k.name, JSON.stringify(u));
      }
    }
    cursor = l.list_complete ? null : l.cursor;
  } while (cursor);

  /* Arka Plan Planbition Onay & Değişiklik Bildirimi (PC kapalıyken bile çalışır, %0 Token) */
  if (firstSub && env.PB_USER && env.PB_PASS) {
    try {
      const lastPb = await env.KV.get('pb:state', 'json') || {};
      if (!lastPb.ts || nowMs - lastPb.ts >= 3300000) {
        const todayIso = localNow(firstSub.u.tz || 'Europe/Amsterdam', nowMs).slice(0, 10);
        const pb = await fetchPlanbitionSchedule(env.PB_USER, env.PB_PASS, 'Carriere', todayIso);
        if (pb && pb.ok) {
          const sig = JSON.stringify(pb.shifts);
          if (pb.totalConfirm > 0 && pb.totalConfirm !== (lastPb.totalConfirm || 0)) {
            await sendPush(firstSub.u.sub, {
              title: 'Onay bekleyen vardiya!',
              body: `Planbition’da ${pb.totalConfirm} adet onay bekleyen yeni vardiyan var.`,
              tag: 'pb-confirm'
            }, env);
          } else if (lastPb.sig && lastPb.sig !== sig) {
            await sendPush(firstSub.u.sub, {
              title: 'Planbition vardiyan değişti',
              body: 'Vardiya saatlerinde veya bölümünde değişiklik var. ShiftPay’i açıp kontrol et.',
              tag: 'pb-change'
            }, env);
          }
          await env.KV.put('pb:state', JSON.stringify({ ts: nowMs, totalConfirm: pb.totalConfirm, sig }));
        }
      }
    } catch (e) {}
  }

  /* Arka Plan PC Fiyat & Stok Kontrolü (PC kapalıyken bile 7/24 çalışır, %0 Token) */
  try {
    const rawItems = await env.KV.get('pc:items', 'json');
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      const pcState = await env.KV.get('pc:state', 'json') || {};
      const lastCheck = pcState.ts || 0;
      if (nowMs - lastCheck >= 3600000) {
        const updates = {};
        const alertsToSend = [];
        const toCheck = rawItems.filter(x => x && x.id && typeof x.url === 'string' && /^https:\/\/(www\.)?(itopya\.com|gaming\.gen\.tr|gamegaraj\.com)\//i.test(x.url)).slice(0, 16);
        for (const item of toCheck) {
          const r = await scrapeProductPage(item.url);
          if (r && r.ok) {
            updates[item.id] = { price: r.price || item.price, stock: r.stock };
            const oldP = (pcState.prices && pcState.prices[item.id]) || item.price;
            const oldSt = (pcState.stocks && pcState.stocks[item.id]) || item.stock;
            if (r.price > 0 && oldP > 0 && r.price < oldP) {
              const diff = oldP - r.price;
              alertsToSend.push({
                title: 'ShiftPay · Fiyat Düştü! 🎯',
                body: `${item.name} fiyatı ${r.price.toLocaleString('tr-TR')} ₺'ye düştü! (${diff.toLocaleString('tr-TR')} ₺ indirim)`,
                tag: 'pc-drop-' + item.id
              });
            }
            if (oldSt === 'yok' && r.stock === 'var') {
              alertsToSend.push({
                title: 'ShiftPay · Stok Geldi! 📦',
                body: `${item.name} yeniden stoka girdi (${(r.price || item.price).toLocaleString('tr-TR')} ₺)!`,
                tag: 'pc-stock-' + item.id
              });
            }
          }
        }
        if (alertsToSend.length > 0) {
          let cur = null;
          do {
            const list = await env.KV.list({ prefix: 'u:', cursor: cur });
            for (const key of list.keys) {
              const u = await env.KV.get(key.name, 'json');
              if (!u || !u.sub || u.pcWatch === 0) continue;
              for (const al of alertsToSend) {
                try { await sendPush(u.sub, al, env); } catch (e) {}
              }
            }
            cur = list.list_complete ? null : list.cursor;
          } while (cur);
        }
        const newPrices = Object.assign({}, pcState.prices || {});
        const newStocks = Object.assign({}, pcState.stocks || {});
        Object.keys(updates).forEach(id => {
          if (updates[id].price) newPrices[id] = updates[id].price;
          if (updates[id].stock) newStocks[id] = updates[id].stock;
        });
        await env.KV.put('pc:state', JSON.stringify({ ts: nowMs, prices: newPrices, stocks: newStocks }));
      }
    }
  } catch (e) {}

  return n;
}

export default {
  fetch: (req, env) => handle(req, env),
  scheduled: (ev, env, ctx) => { ctx.waitUntil(scan(env, Date.now())); }
};
export { due, scan, encryptPayload, handle, cleanSync, localNow };

/* Maaş Takip bildirim sunucusu (Cloudflare Worker).
   Sakladığı: telefonun bildirim adresi, saat dilimi, bildirim saati/günleri ve önümüzdeki günler için
   "vardiya girilmiş mi" + vardiya bitiş saati. Maaş, tutar, bordro ve PC planı hiç gelmez. */
const VAPID_PUBLIC = 'BNC8z6r6nw5KHuX-BHUvS_UtDme9G0J8InlDAtPo8mq38-Uz0ugRnoEia5FSJ5POcQOuuKW3IBDUl45T-WVCd_Y';
const SUBJECT = 'https://okanozgur16.github.io/maas-takip/';
const PUSH_HOSTS = [/(^|\.)push\.apple\.com$/, /(^|\.)googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
const MAX_USERS = 300;
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
  const plan = (Array.isArray(b.plan) ? b.plan : []).slice(0, 8).filter(p => p && rxD.test(p.d)).map(p => ({ d: p.d, s: p.s ? 1 : 0, e: typeof p.e === 'string' && rxDT.test(p.e) ? p.e : null }));
  return { sub: { endpoint: b.sub.endpoint, keys: { p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth } }, tz: b.tz, lang: b.lang === 'en' ? 'en' : 'tr', days, at: rxT.test(b.at) ? b.at : '07:00', plan };
}

/* ---------- Zaman ---------- */
function localNow(tz, ms) {
  const f = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ms).replace(' ', 'T');
  return f.replace(/T24:/, 'T00:');
}
const addMin = (dt, m) => { const t = Date.UTC(+dt.slice(0, 4), +dt.slice(5, 7) - 1, +dt.slice(8, 10), +dt.slice(11, 13), +dt.slice(14, 16)) + m * 60000; return new Date(t).toISOString().slice(0, 16); };

/* ---------- Metinler ---------- */
const TXT = {
  tr: { a: ['Vardiyanı ayarla', 'Bugün için vardiya girilmemiş. Vardiyanı ayarla ki tahmin doğru çıksın.'], e: t => ['Bu saatte mi çıktın?', 'Vardiyan ' + t + ' gibi bitiyordu. Gerçek çıkış saatini güncelle, tahmin doğru çıksın.'], t: ['Deneme bildirimi', 'Vardiya bildirimleri çalışıyor.'] },
  en: { a: ['Set your shift', 'No shift is set for today. Set it so your estimate stays accurate.'], e: t => ['Did you leave at this time?', 'Your shift was due to end around ' + t + '. Update the real finishing time so your estimate stays accurate.'], t: ['Test notification', 'Shift notifications are working.'] }
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
    if (!p.e) continue;
    const from = addMin(p.e, 10), to = addMin(p.e, 240);
    if (now >= from && now <= to && !sent['e' + p.e] && !(seen && seen >= p.e)) out.push({ k: 'e' + p.e, kind: 'e', t: p.e.slice(11) });
  }
  return out;
}

/* ---------- Giriş noktaları ---------- */
const cors = (env, req) => ({ 'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || 'https://okanozgur16.github.io', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' });
const json = (o, s, env, req) => new Response(JSON.stringify(o), { status: s || 200, headers: Object.assign({ 'Content-Type': 'application/json' }, cors(env, req)) });

async function handle(req, env) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env, req) });
  const url = new URL(req.url);
  if (req.method !== 'POST') return json({ ok: true, name: 'maas-takip-bildirim' }, 200, env, req);
  const origin = req.headers.get('Origin');
  if (origin && origin !== (env.ALLOWED_ORIGIN || 'https://okanozgur16.github.io')) return json({ ok: false }, 403, env, req);
  const raw = await req.text(); if (raw.length > 8192) return json({ ok: false }, 413, env, req);
  let b; try { b = JSON.parse(raw); } catch (e) { return json({ ok: false }, 400, env, req); }
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
  let cursor, n = 0;
  do {
    const l = await env.KV.list({ prefix: 'u:', cursor });
    for (const k of l.keys) {
      const u = await env.KV.get(k.name, 'json'); if (!u || !u.sub) continue;
      if (nowMs - (u.up || 0) > 30 * 86400000) { await env.KV.delete(k.name); continue; }
      const todo = due(u, nowMs); if (!todo.length) continue;
      u.sent = u.sent || {};
      for (const x of todo) {
        const T = TXT[u.lang], m = x.kind === 'a' ? T.a : T.e(x.t);
        let st = 0; try { st = await sendPush(u.sub, { title: m[0], body: m[1], tag: x.kind === 'a' ? 'shift-a' : 'shift-e' }, env); } catch (e) {}
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
  return n;
}

export default {
  fetch: (req, env) => handle(req, env),
  scheduled: (ev, env, ctx) => { ctx.waitUntil(scan(env, Date.now())); }
};
export { due, scan, encryptPayload, handle, cleanSync, localNow };

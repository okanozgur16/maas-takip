import fs from 'node:fs';
import * as webpush from 'web-push';

const PUBLIC = 'BNC8z6r6nw5KHuX-BHUvS_UtDme9G0J8InlDAtPo8mq38-Uz0ugRnoEia5FSJ5POcQOuuKW3IBDUl45T-WVCd_Y';
const priv = (process.env.VAPID_PRIVATE || '').trim();
const raw = (process.env.PUSH_SUB || '').trim();
if (!priv || !raw) { console.log('VAPID_PRIVATE veya PUSH_SUB eksik, bildirim gönderilmedi.'); process.exit(1); }

let subs;
try { subs = JSON.parse(raw); } catch (e) { console.log('PUSH_SUB geçerli JSON değil.'); process.exit(1); }
if (!Array.isArray(subs)) subs = [subs];

let n = 0;
try { n = Number(JSON.parse(fs.readFileSync('notify.json', 'utf8')).n) || 0; } catch (e) {}
const manual = process.env.MANUAL === 'true';
if (!n && !manual) { console.log('Yenilik yok, bildirim gönderilmedi.'); process.exit(0); }

const body = manual && !n ? 'Deneme bildirimi: bağlantı çalışıyor.' : (n === 1 ? '1 yenilik var.' : n + ' yenilik var.') + ' Uygulamayı açıp PC planına bak.';
const payload = JSON.stringify({ title: 'PC fiyat takibi', body });
webpush.setVapidDetails('https://okanozgur16.github.io/maas-takip/', PUBLIC, priv);

let ok = 0;
for (const s of subs) {
  try { await webpush.sendNotification(s, payload, { TTL: 86400, urgency: 'normal' }); ok++; }
  catch (e) { console.log('Gönderilemedi, durum:', e.statusCode || 'bilinmiyor'); }
}
console.log(ok + '/' + subs.length + ' cihaza gönderildi.');
process.exit(ok ? 0 : 1);

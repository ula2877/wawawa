import { io } from 'socket.io-client';

const BASE = process.env.BASE ?? 'http://localhost:3000';

function step(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label}`);
  process.exitCode ??= 0;
  if (!ok) process.exitCode = 1;
}

async function api(path, method, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

const login = await api('/api/login', 'POST', null, {
  email: 'admin@example.com',
  password: 'password',
});
const token = login.json.token;
function ok(res) { return res && res.status >= 200 && res.status < 300; }

step(`login (status ${login.status})`, ok(login) && !!token);

const { id } = (await api('/api/whatsapp-accounts', 'POST', token, { name: 'Socket Smoke' })).json.data;
step('account created', !!id);

const sock = io(`${BASE}/whatsapp`, {
  auth: { token },
  transports: ['websocket'],
  timeout: 5000,
});

let connected = false;
let qrEvent = null;
let statusEvents = [];
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('socket handshake timed out')), 8000);
  sock.on('connect', () => { connected = true; clearTimeout(timeout); resolve(); });
  sock.on('connect_error', (err) => { clearTimeout(timeout); reject(err); });
});
step('socket.io connected (JWT handshake OK)', connected);

sock.on('whatsapp:qr', (payload) => { qrEvent = payload; });
sock.on('whatsapp:status', (payload) => { if (payload.accountId === id) statusEvents.push(payload.status); });

const connectRes = await api(`/api/whatsapp-accounts/${id}/connect`, 'POST', token);
step(`connect -> ${connectRes.status} ${connectRes.json?.data?.status ?? ''}`, ok(connectRes) && connectRes.json.data.status === 'CONNECTING');

await new Promise((r) => setTimeout(r, 6000));

if (qrEvent) {
  step(`whatsapp:qr received for ${qrEvent.accountId}`, qrEvent.accountId === id);
  step('qr payload includes image dataURL', typeof qrEvent.image === 'string' && qrEvent.image.startsWith('data:image/png;base64,'));
  step('qr payload includes raw string', typeof qrEvent.qr === 'string' && qrEvent.qr.length > 0);
} else {
  step('whatsapp:qr received', false);
}

step(`status events observed: ${statusEvents.join(', ')}`, statusEvents.includes('CONNECTING'));

sock.disconnect();

const logoutRes = await api(`/api/whatsapp-accounts/${id}/logout`, 'POST', token);
step(`logout -> ${logoutRes.status} ${logoutRes.json?.data?.status ?? ''}`, ok(logoutRes) && logoutRes.json.data.status === 'LOGGED_OUT');

const maxWait = Date.now() + 8000;
let sessionFolderGone = false;
while (Date.now() < maxWait) {
  const { access } = await import('node:fs/promises');
  const exists = await access(`storage/whatsapp-sessions/${id}`).then(() => true).catch(() => false);
  if (!exists) { sessionFolderGone = true; break; }
  await new Promise((r) => setTimeout(r, 500));
}
step('session folder removed after logout', sessionFolderGone);

await api(`/api/whatsapp/accounts/${id}`, 'DELETE', token);
console.log('done');
process.exit(process.exitCode ?? 0);
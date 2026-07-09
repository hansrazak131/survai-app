/* =====================================================================
   Tukang Ngukur — Server Auth + Sync (zero-dependency, Node.js murni)
   Jalankan:  node server/server.js   (atau: npm run server)
   Lalu di form login aplikasi isi Server: http://127.0.0.1:8787

   Endpoint yang dipakai public/maps.html:
     GET  /auth/config                      -> {google_client_id, dev_auth}
     POST /auth/google  {id_token}          -> {email, via, dev_code?}
     POST /auth/verify  {email,code,device} -> {token,email,name,expires_at}
     GET  /auth/me      (Bearer)            -> {email,name} | 401
     POST /auth/logout  (Bearer)            -> {ok:true}
     POST /projects/:id/sync                -> {sync_token, server_changes[]}
     POST /projects/:id/attachments        -> {ok:true}
   Tambahan untuk kantor/QGIS:
     GET  /projects/:id/features.geojson    -> FeatureCollection semua fitur
     POST /projects/:id/push                -> kirim GeoJSON dari kantor ke lapangan
   ===================================================================== */
'use strict';
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/* ---------- Konfigurasi (edit server/config.json) ---------- */
const ROOT = __dirname;
const DATA = path.join(ROOT, 'data');
const CFG_FILE = path.join(ROOT, 'config.json');
const DEFAULT_CFG = {
  port: 8787,
  dev_auth: true,            // true = login tanpa Google, kode tampil di konsol
  google_client_id: '',      // isi Client ID Google untuk login Google asli
  session_days: 30,          // masa berlaku token login
  allowed_emails: [],        // kosong = semua email boleh; isi utk membatasi
  blocked_emails: [],        // email yang DILARANG login (menang atas whitelist)
  admin_emails: []           // email yang boleh membuka halaman /admin
};
let CFG = DEFAULT_CFG;
try { CFG = Object.assign({}, DEFAULT_CFG, JSON.parse(fs.readFileSync(CFG_FILE, 'utf8'))); }
catch (e) { fs.writeFileSync(CFG_FILE, JSON.stringify(DEFAULT_CFG, null, 2)); }

/* ---------- Penyimpanan sederhana berbasis file JSON ---------- */
fs.mkdirSync(DATA, { recursive: true });
function loadJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
}
function saveJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 1));
}
const SESS_FILE = path.join(DATA, 'sessions.json');
let sessions = loadJSON(SESS_FILE, {});          // token -> {email,name,device,expires_at}
const LOGIN_LOG = path.join(DATA, 'logins.json');
let loginLog = loadJSON(LOGIN_LOG, []);          // riwayat login permanen (tidak terhapus saat logout)
const codes = {};                                // email -> {code,name,exp} (sementara, di memori)

function projDir(id) { return path.join(DATA, 'projects', id.replace(/[^a-zA-Z0-9_-]/g, '_')); }
function loadProj(id) {
  const d = projDir(id);
  return {
    features: loadJSON(path.join(d, 'features.json'), {}),   // id -> feature
    tasks: loadJSON(path.join(d, 'tasks.json'), {}),         // id -> task
    changelog: loadJSON(path.join(d, 'changelog.json'), []), // [{seq,device_id,...}]
  };
}
function saveProj(id, p) {
  const d = projDir(id);
  saveJSON(path.join(d, 'features.json'), p.features);
  saveJSON(path.join(d, 'tasks.json'), p.tasks);
  saveJSON(path.join(d, 'changelog.json'), p.changelog);
}

/* ---------- Util ---------- */
function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > 60 * 1024 * 1024) { reject(new Error('payload terlalu besar')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new Error('JSON tidak valid')); } });
    req.on('error', reject);
  });
}
function bearer(req) {
  const m = /^Bearer\s+(.+)$/.exec(req.headers.authorization || '');
  return m ? m[1] : null;
}
function session(req) {
  const t = bearer(req); if (!t) return null;
  const s = sessions[t]; if (!s) return null;
  if (new Date(s.expires_at) < new Date()) { delete sessions[t]; saveJSON(SESS_FILE, sessions); return null; }
  return s;
}
function lc(e) { return String(e || '').toLowerCase().trim(); }
function isAdmin(email) { return (CFG.admin_emails || []).map(lc).includes(lc(email)); }
function isBlocked(email) { return (CFG.blocked_emails || []).map(lc).includes(lc(email)); }
function emailAllowed(email) {
  if (isBlocked(email)) return false;
  return !CFG.allowed_emails.length || CFG.allowed_emails.map(lc).includes(lc(email));
}
function saveCfg() { saveJSON(CFG_FILE, CFG); }
function kickEmail(email) {
  let n = 0;
  for (const [t, s] of Object.entries(sessions)) if (lc(s.email) === lc(email)) { delete sessions[t]; n++; }
  if (n) saveJSON(SESS_FILE, sessions);
  return n;
}
/* Verifikasi ID token Google via endpoint tokeninfo resmi (tanpa dependensi) */
function verifyGoogleToken(idToken) {
  return new Promise((resolve, reject) => {
    https.get('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken), r => {
      let b = ''; r.on('data', c => b += c);
      r.on('end', () => {
        try {
          const d = JSON.parse(b);
          if (r.statusCode !== 200) return reject(new Error(d.error_description || 'token Google tidak valid'));
          if (CFG.google_client_id && d.aud !== CFG.google_client_id) return reject(new Error('token bukan untuk aplikasi ini'));
          resolve({ email: d.email, name: d.name || d.email });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

/* ---------- Handler ---------- */
async function handle(req, res, url) {
  const p = url.pathname;

  /* ===== AUTH ===== */
  if (p === '/auth/config' && req.method === 'GET')
    return json(res, 200, { google_client_id: CFG.google_client_id || null, dev_auth: !!CFG.dev_auth });

  if (p === '/auth/google' && req.method === 'POST') {
    const { id_token } = await readBody(req);
    let who;
    if (String(id_token).startsWith('dev:')) {
      if (!CFG.dev_auth) return json(res, 403, { error: 'Mode dev dimatikan di server' });
      const [, email, name] = String(id_token).split(':');
      who = { email, name: name || email };
    } else {
      who = await verifyGoogleToken(id_token).catch(e => null);
      if (!who) return json(res, 401, { error: 'Verifikasi akun Google gagal' });
    }
    if (!emailAllowed(who.email)) return json(res, 403, { error: 'Email tidak terdaftar — hubungi admin' });
    const code = String(crypto.randomInt(100000, 999999));
    codes[who.email] = { code, name: who.name, exp: Date.now() + 10 * 60 * 1000 };
    /* Belum ada SMTP: kode ditampilkan di konsol server (via:'console').
       Untuk email sungguhan, kirim `code` lewat layanan email di sini. */
    console.log('[AUTH] Kode verifikasi untuk ' + who.email + ': ' + code);
    const out = { email: who.email, via: 'console' };
    if (CFG.dev_auth) out.dev_code = code; // pre-fill otomatis saat mode dev
    return json(res, 200, out);
  }

  if (p === '/auth/verify' && req.method === 'POST') {
    const { email, code, device } = await readBody(req);
    const c = codes[email];
    if (!c || c.exp < Date.now()) return json(res, 400, { error: 'Kode kedaluwarsa — ulangi login' });
    if (c.code !== String(code)) return json(res, 400, { error: 'Kode salah' });
    delete codes[email];
    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + CFG.session_days * 864e5).toISOString();
    sessions[token] = { email, name: c.name, device: device || '', expires_at, created_at: new Date().toISOString() };
    saveJSON(SESS_FILE, sessions);
    loginLog.push({ email, name: c.name, device: device || '', ip: req.socket.remoteAddress || '', at: new Date().toISOString() });
    saveJSON(LOGIN_LOG, loginLog);
    console.log('[AUTH] Login berhasil: ' + email + ' (' + (device || 'perangkat?') + ')');
    return json(res, 200, { token, email, name: c.name, expires_at });
  }

  if (p === '/auth/me' && req.method === 'GET') {
    const s = session(req);
    return s ? json(res, 200, { email: s.email, name: s.name }) : json(res, 401, { error: 'Sesi tidak valid' });
  }

  if (p === '/auth/logout' && req.method === 'POST') {
    const t = bearer(req);
    if (t && sessions[t]) { delete sessions[t]; saveJSON(SESS_FILE, sessions); }
    return json(res, 200, { ok: true });
  }

  /* ===== ADMIN: halaman pemantauan login ===== */
  if ((p === '/admin' || p === '/admin/' || p === '/') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(ROOT, 'admin.html')));
  }

  /* ===== ADMIN: siapa saja yang login (khusus email di admin_emails) ===== */
  if (p === '/admin/logins' && req.method === 'GET') {
    const s = session(req);
    if (!s || !(CFG.admin_emails || []).includes(s.email)) return json(res, 403, { error: 'Khusus admin — tambahkan email Anda di admin_emails (server/config.json)' });
    const active = Object.values(sessions).filter(x => new Date(x.expires_at) > new Date());
    return json(res, 200, { active_sessions: active, history: loginLog.slice(-500).reverse() });
  }

  /* ===== PROJECTS (perlu login) ===== */
  const mSync = /^\/projects\/([^/]+)\/(sync|attachments|push|features\.geojson)$/.exec(p);
  if (mSync) {
    if (!session(req)) return json(res, 401, { error: 'Perlu login' });
    const pid = decodeURIComponent(mSync[1]);
    const proj = loadProj(pid);

    if (mSync[2] === 'sync' && req.method === 'POST') {
      const body = await readBody(req);
      const dev = body.device_id || 'unknown';
      let seq = proj.changelog.length ? proj.changelog[proj.changelog.length - 1].seq : 0;
      /* terapkan perubahan dari lapangan (last-write-wins per timestamp) */
      for (const ch of (body.changes || [])) {
        if (ch.entity === 'task') { proj.tasks[ch.id] = ch.task || proj.tasks[ch.id]; continue; }
        if (ch.entity !== 'feature') continue;
        if (ch.action === 'delete') delete proj.features[ch.id];
        else {
          const ex = proj.features[ch.id];
          if (!ex || new Date(ch.timestamp || 0) >= new Date(ex.timestamp || 0)) {
            proj.features[ch.id] = { id: ch.id, layer: ch.layer_id || ch.layer || 'point', geometry: ch.geometry,
              attributes: ch.attributes || {}, workflow_status: ch.workflow_status || 'draft',
              gps: ch.gps || null, version: ch.version || 1, timestamp: ch.timestamp };
          }
        }
        proj.changelog.push({ seq: ++seq, device_id: dev, entity: 'feature', action: ch.action, id: ch.id,
          layer: ch.layer_id || ch.layer || 'point', geometry: ch.geometry, attributes: ch.attributes || {},
          workflow_status: ch.workflow_status, gps: ch.gps || null, version: ch.version || 1, timestamp: ch.timestamp });
      }
      /* kirim balik perubahan dari perangkat/kantor lain sejak token terakhir */
      const since = parseInt(body.last_sync_token, 10) || 0;
      const server_changes = proj.changelog.filter(c => c.seq > since && c.device_id !== dev);
      saveProj(pid, proj);
      return json(res, 200, { sync_token: String(seq), server_changes });
    }

    if (mSync[2] === 'attachments' && req.method === 'POST') {
      const a = await readBody(req);
      if (!a.id || !a.data_base64) return json(res, 400, { error: 'lampiran tidak lengkap' });
      const dir = path.join(projDir(pid), 'attachments');
      fs.mkdirSync(dir, { recursive: true });
      const ext = a.mime === 'image/png' ? '.png' : (String(a.mime).startsWith('audio') ? '.webm' : '.jpg');
      fs.writeFileSync(path.join(dir, a.id.replace(/[^a-zA-Z0-9_-]/g, '_') + ext), Buffer.from(a.data_base64, 'base64'));
      const meta = loadJSON(path.join(dir, 'index.json'), {});
      meta[a.id] = { feature_id: a.feature_id, type: a.type, mime: a.mime, gps: a.gps, created_at: a.created_at, device_id: a.device_id };
      saveJSON(path.join(dir, 'index.json'), meta);
      return json(res, 200, { ok: true });
    }

    /* Ekspor semua fitur sebagai GeoJSON (untuk dibuka di QGIS) */
    if (mSync[2] === 'features.geojson' && req.method === 'GET') {
      const features = Object.values(proj.features).map(f => ({ type: 'Feature', id: f.id,
        geometry: f.geometry, properties: Object.assign({ _layer: f.layer, _status: f.workflow_status, _version: f.version }, f.attributes) }));
      return json(res, 200, { type: 'FeatureCollection', features });
    }

    /* Kantor mengirim GeoJSON -> masuk ke changelog agar ditarik perangkat lapangan */
    if (mSync[2] === 'push' && req.method === 'POST') {
      const gj = await readBody(req);
      let seq = proj.changelog.length ? proj.changelog[proj.changelog.length - 1].seq : 0;
      let n = 0;
      for (const f of (gj.features || [])) {
        const id = String(f.id || (f.properties && f.properties.id) || crypto.randomBytes(8).toString('hex'));
        const attrs = Object.assign({}, f.properties); delete attrs._layer; delete attrs._status; delete attrs._version;
        const rec = { id, layer: (f.properties && f.properties._layer) || 'point', geometry: f.geometry,
          attributes: attrs, workflow_status: (f.properties && f.properties._status) || 'draft',
          gps: null, version: 1, timestamp: new Date().toISOString() };
        proj.features[id] = rec; n++;
        proj.changelog.push(Object.assign({ seq: ++seq, device_id: 'office', entity: 'feature', action: 'update' }, rec));
      }
      saveProj(pid, proj);
      return json(res, 200, { ok: true, imported: n, sync_token: String(seq) });
    }
  }

  json(res, 404, { error: 'Tidak ditemukan: ' + req.method + ' ' + p });
}

/* ---------- Server + CORS ---------- */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  handle(req, res, url).catch(e => json(res, 500, { error: String(e.message || e) }));
});
server.listen(CFG.port, () => {
  console.log('==========================================================');
  console.log(' Tukang Ngukur Server aktif di http://127.0.0.1:' + CFG.port);
  console.log(' Isi kolom "Server" di aplikasi: http://127.0.0.1:' + CFG.port);
  console.log(' Mode dev_auth: ' + (CFG.dev_auth ? 'AKTIF (login tanpa Google)' : 'nonaktif'));
  console.log(' Data tersimpan di: ' + DATA);
  console.log('==========================================================');
});

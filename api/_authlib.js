// api/_authlib.js — util auth STATELESS untuk Vercel serverless (tanpa database).
// OTP: kode di-HMAC jadi "ticket" (tidak membocorkan kode). Sesi: token HMAC-signed.
// File berawalan "_" TIDAK menjadi route Vercel, hanya diimpor endpoint lain.
import crypto from 'crypto';

const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';

// Client ID Google bersifat PUBLIK (sudah tampil di HTML) → fallback aman agar
// login Google jalan tanpa perlu set env. Override via GOOGLE_CLIENT_ID bila perlu.
const DEFAULT_GOOGLE_CLIENT_ID = '218183840130-qu372farj02hik2o7gu4250b5k1nk8d5.apps.googleusercontent.com';
export const CFG = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID,
  devAuth: String(process.env.DEV_AUTH || '').toLowerCase() === 'true',
  sessionDays: parseInt(process.env.SESSION_DAYS || '30', 10),
  adminEmails: split(process.env.ADMIN_EMAILS),
  allowedEmails: split(process.env.ALLOWED_EMAILS),
  blockedEmails: split(process.env.BLOCKED_EMAILS),
};
function split(s) { return String(s || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean); }

export function lc(e) { return String(e || '').toLowerCase().trim(); }
export function isAdmin(e) { return CFG.adminEmails.includes(lc(e)); }
export function emailAllowed(e) {
  if (CFG.blockedEmails.includes(lc(e))) return false;
  return !CFG.allowedEmails.length || CFG.allowedEmails.includes(lc(e));
}

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlJson(o) { return b64url(JSON.stringify(o)); }
function unb64urlJson(s) { try { return JSON.parse(Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')); } catch (_) { return null; } }
function hmac(data) { return b64url(crypto.createHmac('sha256', SECRET).update(data).digest()); }
function safeEq(a, b) { const A = Buffer.from(String(a || '')), B = Buffer.from(String(b || '')); return A.length === B.length && crypto.timingSafeEqual(A, B); }

export function gen6() { return String(crypto.randomInt(100000, 999999)); }

/* OTP ticket: base64url({e,x}) + '.' + HMAC(e|code|x). Klien tak bisa menurunkan kode dari ticket. */
export function makeOtpTicket(email, code, expMs) {
  const p = b64urlJson({ e: lc(email), x: expMs });
  return p + '.' + hmac(lc(email) + '|' + code + '|' + expMs);
}
export function checkOtpTicket(email, code, ticket) {
  if (!ticket || String(ticket).indexOf('.') < 0) return false;
  const [p, sig] = String(ticket).split('.');
  const pl = unb64urlJson(p); if (!pl) return false;
  if (lc(pl.e) !== lc(email)) return false;
  if (Date.now() > Number(pl.x)) return false;
  return safeEq(sig, hmac(lc(email) + '|' + code + '|' + Number(pl.x)));
}

/* Sesi: base64url({email,name,exp}) + '.' + HMAC('s.'+payload). */
export function makeSession(email, name) {
  const exp = Date.now() + CFG.sessionDays * 864e5;
  const nm = name || lc(email).split('@')[0];
  const p = b64urlJson({ email: lc(email), name: nm, exp });
  return { token: p + '.' + hmac('s.' + p), email: lc(email), name: nm, expires_at: new Date(exp).toISOString() };
}
export function verifySession(token) {
  if (!token || String(token).indexOf('.') < 0) return null;
  const [p, sig] = String(token).split('.');
  if (!safeEq(sig, hmac('s.' + p))) return null;
  const pl = unb64urlJson(p); if (!pl) return null;
  if (Date.now() > Number(pl.exp)) return null;
  return { email: pl.email, name: pl.name };
}

/* Verifikasi ID token Google via endpoint resmi (tanpa dependensi). */
export async function verifyGoogleToken(idToken) {
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  const d = await r.json();
  if (!r.ok) throw new Error(d.error_description || 'token Google tidak valid');
  if (CFG.googleClientId && d.aud !== CFG.googleClientId) throw new Error('token bukan untuk aplikasi ini');
  return { email: d.email, name: d.name || d.email };
}

/* ---- helper request/response ---- */
export function readBody(req) { try { return typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {}); } catch (_) { return {}; } }
export function bearer(req) { const m = /^Bearer\s+(.+)$/.exec(req.headers.authorization || ''); return m ? m[1] : null; }
export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

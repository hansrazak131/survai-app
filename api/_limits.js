// api/_limits.js — batas anti-abuse & kuota akun, di atas KV (Redis).
// Semua "fail-open": bila KV belum dipasang atau error, login TIDAK terhalang.
import { kvEnabled, kvIncrTtl, kvSAdd, kvSCard, kvSIsMember } from './_kv.js';
import { lc } from './_authlib.js';

const MAX_ACCOUNTS = parseInt(process.env.MAX_ACCOUNTS || '1000', 10);
const OTP_SEND_MAX = parseInt(process.env.OTP_SEND_MAX || '3', 10);   // per email / jam
const OTP_TRY_MAX = parseInt(process.env.OTP_TRY_MAX || '10', 10);    // percobaan kode / 10 mnt

/* Batasi pengiriman OTP (cegah spam & boros biaya email). */
export async function otpSendAllowed(email) {
  if (!kvEnabled()) return { ok: true, enforced: false };
  try { const n = await kvIncrTtl('otp:send:' + lc(email), 3600); return { ok: n <= OTP_SEND_MAX, n }; }
  catch (e) { console.warn('KV otpSend', e.message); return { ok: true, enforced: false }; }
}

/* Batasi percobaan verifikasi kode (cegah brute-force 6 digit). */
export async function otpVerifyAllowed(email) {
  if (!kvEnabled()) return { ok: true, enforced: false };
  try { const n = await kvIncrTtl('otp:try:' + lc(email), 600); return { ok: n <= OTP_TRY_MAX, n }; }
  catch (e) { console.warn('KV otpTry', e.message); return { ok: true, enforced: false }; }
}

/* Kuota total akun (mis. 1000). Akun lama tetap boleh; akun baru ditolak bila penuh. */
export async function registerAccount(email) {
  if (!kvEnabled()) return { ok: true, enforced: false };
  try {
    const em = lc(email);
    if (await kvSIsMember('accounts', em)) return { ok: true, existing: true };
    const count = await kvSCard('accounts');
    if (count >= MAX_ACCOUNTS) return { ok: false, full: true, count };
    await kvSAdd('accounts', em);
    return { ok: true, count: count + 1 };
  } catch (e) { console.warn('KV register', e.message); return { ok: true, enforced: false }; }
}

export { MAX_ACCOUNTS };

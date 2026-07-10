// POST /api/auth/delete-account (Bearer) → hapus akun dari server.
// Data server yang tersimpan per pengguna hanya email (di set 'accounts' KV untuk
// kuota & keamanan) + counter rate-limit. Semua dihapus di sini. Data survei &
// sesi tersimpan LOKAL di perangkat → dihapus oleh klien (lihat ppDeleteAccount).
import { cors, bearer, verifySession, lc } from '../_authlib.js';
import { kvEnabled, kvSRem, kvDel } from '../_kv.js';
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const s = verifySession(bearer(req));
  if (!s) return res.status(401).json({ error: 'Perlu login' });
  const em = lc(s.email);
  if (kvEnabled()) {
    try {
      await kvSRem('accounts', em);        // bebaskan slot kuota
      await kvDel('otp:send:' + em);       // bersihkan counter rate-limit
      await kvDel('otp:try:' + em);
    } catch (e) { /* fail-open: tetap laporkan sukses agar klien membersihkan lokal */ }
  }
  return res.status(200).json({ ok: true, deleted: em });
}

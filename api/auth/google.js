// POST /api/auth/google {id_token} → sesi langsung (satu langkah, tanpa OTP).
import { CFG, cors, readBody, verifyGoogleToken, emailAllowed, makeSession } from '../_authlib.js';
import { registerAccount, MAX_ACCOUNTS } from '../_limits.js';
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { id_token } = readBody(req);
  let who;
  if (String(id_token).startsWith('dev:')) {
    if (!CFG.devAuth) return res.status(403).json({ error: 'Mode dev dimatikan di server' });
    const [, email, name] = String(id_token).split(':');
    who = { email, name: name || email };
  } else {
    try { who = await verifyGoogleToken(id_token); }
    catch (e) { return res.status(401).json({ error: 'Verifikasi akun Google gagal' }); }
  }
  if (!who.email) return res.status(400).json({ error: 'Akun Google tanpa email' });
  if (!emailAllowed(who.email)) return res.status(403).json({ error: 'Email tidak terdaftar — hubungi admin' });
  const reg = await registerAccount(who.email);
  if (!reg.ok) return res.status(403).json({ error: 'Kuota pengguna penuh (maks ' + MAX_ACCOUNTS + '). Hubungi admin.' });
  return res.status(200).json(makeSession(who.email, who.name));
}

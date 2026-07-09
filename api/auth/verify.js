// POST /api/auth/verify {email, code, ticket} → sesi.
import { cors, readBody, checkOtpTicket, makeSession, emailAllowed, lc } from '../_authlib.js';
export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email, code, ticket } = readBody(req);
  const em = lc(email);
  if (!emailAllowed(em)) return res.status(403).json({ error: 'Email tidak terdaftar' });
  if (!/^\d{6}$/.test(String(code || ''))) return res.status(400).json({ error: 'Kode harus 6 digit' });
  if (!checkOtpTicket(em, String(code), ticket)) return res.status(400).json({ error: 'Kode salah atau kedaluwarsa — ulangi login' });
  return res.status(200).json(makeSession(em));
}

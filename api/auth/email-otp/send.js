// POST /api/auth/email-otp/send {email} → {email, via, ticket, dev_code?}
// Stateless: kode dititipkan sebagai HMAC "ticket" yang dibawa balik saat verify.
import { CFG, cors, readBody, emailAllowed, makeOtpTicket, gen6, lc } from '../../_authlib.js';
import { deliverCode } from '../../_mail.js';
import { otpSendAllowed } from '../../_limits.js';
export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = readBody(req);
  const em = lc(email);
  if (!em || !em.includes('@')) return res.status(400).json({ error: 'Email tidak valid' });
  if (!emailAllowed(em)) return res.status(403).json({ error: 'Email tidak terdaftar — hubungi admin' });
  const rl = await otpSendAllowed(em);
  if (!rl.ok) return res.status(429).json({ error: 'Terlalu banyak permintaan kode untuk email ini. Coba lagi dalam 1 jam.' });
  const code = gen6();
  const ticket = makeOtpTicket(em, code, Date.now() + 10 * 60 * 1000);
  const via = await deliverCode(em, code);
  const out = { email: em, via, ticket };
  if (CFG.devAuth) out.dev_code = code; // hanya saat DEV_AUTH=true (uji coba) — matikan di produksi
  return res.status(200).json(out);
}

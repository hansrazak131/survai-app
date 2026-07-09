// POST /api/auth/logout → {ok:true}. Sesi stateless: cukup hapus token di klien.
import { cors } from '../_authlib.js';
export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({ ok: true });
}

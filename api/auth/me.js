// GET /api/auth/me (Bearer) → {email,name} | 401
import { cors, bearer, verifySession } from '../_authlib.js';
export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const s = verifySession(bearer(req));
  return s ? res.status(200).json(s) : res.status(401).json({ error: 'Sesi tidak valid' });
}

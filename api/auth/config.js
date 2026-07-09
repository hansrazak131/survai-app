// GET /api/auth/config → {google_client_id, dev_auth}
import { CFG, cors } from '../_authlib.js';
export default function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  return res.status(200).json({ google_client_id: CFG.googleClientId || null, dev_auth: CFG.devAuth });
}

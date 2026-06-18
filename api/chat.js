// /api/chat.js — Vercel Serverless Function
// AI online jika GEMINI_API_KEY atau GROQ_API_KEY tersedia di Environment Variables.
// Jika tidak ada key -> mode offline/template. API key TIDAK pernah dikirim ke frontend.

const SYSTEM_PROMPT =
  'Anda adalah AI Assistant untuk aplikasi surveyor "Tukang Ngukur / SurvAI". ' +
  'Jawab singkat, teknis, dan praktis untuk pekerjaan survey lapangan (poligon, leveling, ' +
  'tambang, koordinat, volume). Gunakan Bahasa Indonesia.';

export default async function handler(req, res) {
  // CORS sederhana (opsional)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let message = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    message = (body.message || '').toString().slice(0, 4000);
  } catch (_) {}
  if (!message) return res.status(400).json({ error: 'message kosong' });

  const GEMINI = process.env.GEMINI_API_KEY;
  const GROQ = process.env.GROQ_API_KEY;

  try {
    if (GEMINI) {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: message }] }]
          })
        }
      );
      const d = await r.json();
      const reply = d?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return res.status(200).json({ reply, mode: 'gemini' });
    }

    if (GROQ) {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + GROQ },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
          ]
        })
      });
      const d = await r.json();
      const reply = d?.choices?.[0]?.message?.content;
      if (reply) return res.status(200).json({ reply, mode: 'groq' });
    }
  } catch (e) {
    // jatuh ke offline
  }

  // Offline / template
  return res.status(200).json({
    reply:
      'Mode offline aktif (belum ada API key di server). Untuk "' + message +
      '", gunakan menu Calculator atau Tools terkait. Aktifkan GEMINI_API_KEY atau GROQ_API_KEY ' +
      'di Vercel Environment Variables untuk jawaban AI online.',
    mode: 'offline'
  });
}

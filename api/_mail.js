// api/_mail.js — kirim kode OTP. Di serverless, HTTP email API (Resend) paling andal.
// Set RESEND_API_KEY + MAIL_FROM di Vercel Environment Variables untuk pengiriman nyata.
// Tanpa konfigurasi → 'console' (tidak terkirim); pakai DEV_AUTH untuk uji coba.
export async function deliverCode(email, code) {
  const KEY = process.env.RESEND_API_KEY, FROM = process.env.MAIL_FROM;
  if (!KEY || !FROM) return 'console';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + KEY },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: 'Kode Verifikasi Tukang Ngukur',
        text: 'Kode verifikasi Anda: ' + code + '\n\nBerlaku 10 menit. Abaikan email ini bila Anda tidak meminta kode masuk.'
      })
    });
    return r.ok ? 'email' : 'console';
  } catch (_) { return 'console'; }
}

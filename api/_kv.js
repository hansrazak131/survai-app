// api/_kv.js — klien Redis (Upstash / Vercel KV) via REST, TANPA dependensi.
// Env otomatis terisi saat Anda membuat KV store di Vercel:
//   KV_REST_API_URL + KV_REST_API_TOKEN  (atau UPSTASH_REDIS_REST_URL/TOKEN)
// Bila belum ada → kvEnabled() false → fitur limit "fail-open" (app tetap jalan).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export function kvEnabled() { return !!(URL_ && TOKEN); }

async function cmd(args) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(args)
  });
  if (!r.ok) throw new Error('KV HTTP ' + r.status);
  const d = await r.json();
  if (d.error) throw new Error('KV ' + d.error);
  return d.result;
}

/* INCR key; set TTL saat pertama kali dibuat. Mengembalikan nilai baru. */
export async function kvIncrTtl(key, ttlSec) {
  const n = await cmd(['INCR', key]);
  if (n === 1) await cmd(['EXPIRE', key, ttlSec]);
  return n;
}
export async function kvSAdd(set, member) { return cmd(['SADD', set, member]); }
export async function kvSRem(set, member) { return cmd(['SREM', set, member]); }
export async function kvSCard(set) { return cmd(['SCARD', set]); }
export async function kvSIsMember(set, member) { return cmd(['SISMEMBER', set, member]); }
export async function kvDel(key) { return cmd(['DEL', key]); }

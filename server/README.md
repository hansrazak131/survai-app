# Tukang Ngukur — Server (Auth + Sync)

Server lokal untuk form login dan sinkronisasi data survey di `public/maps.html`.
Tanpa dependensi apa pun — cukup Node.js.

## Cara menjalankan

```
node server/server.js
```

atau `npm run server`. Server aktif di **http://127.0.0.1:8787**.

## Cara login di aplikasi

1. Buka `http://127.0.0.1:3000/public/maps.html` seperti biasa.
2. Di kolom **Server** isi: `http://127.0.0.1:8787` → **Lanjut**.
3. Karena `dev_auth` aktif, muncul kolom **MODE DEV — email langsung**:
   ketik email apa saja (mis. `nugrahaegi00@gmail.com`) → **Login Dev**.
4. Kode 6 digit terisi otomatis (juga tampil di konsol server) → **Verifikasi & Masuk**.

Untuk sync data survey: buka Pengaturan Survey di aplikasi dan isi endpoint
dengan alamat server yang sama.

## Konfigurasi (`server/config.json`)

| Kunci | Arti |
|---|---|
| `port` | Port server (default 8787) |
| `dev_auth` | `true` = login tanpa Google, kode otomatis. **Matikan untuk produksi.** |
| `google_client_id` | Client ID dari Google Cloud Console untuk tombol "Masuk dengan Google" |
| `session_days` | Masa berlaku token login (hari) |
| `allowed_emails` | Daftar email yang boleh login; kosong = semua boleh |
| `admin_emails` | Email yang boleh membuka `/admin/logins` (daftar siapa saja yang login) |

## Penyimpanan data

Semua data di `server/data/`:

- `sessions.json` — sesi login aktif
- `logins.json` — riwayat semua login (permanen; email, perangkat, IP, waktu)
- `projects/<id>/features.json` — fitur survey (last-write-wins)
- `projects/<id>/changelog.json` — riwayat perubahan untuk sync antar perangkat
- `projects/<id>/attachments/` — foto/audio hasil upload

## Halaman admin (siapa saja yang login)

Buka **http://127.0.0.1:8787/admin** di browser, lalu login dengan email yang
terdaftar di `admin_emails`. Halaman menampilkan sesi aktif, riwayat login
(waktu, email, IP, perangkat), dan statistik ringkas; dimuat ulang otomatis
tiap 30 detik. Catatan: tombol Google di halaman ini butuh origin
`http://127.0.0.1:8787` didaftarkan di Authorized JavaScript origins (Google
Cloud Console); tanpa itu gunakan login dev.

## Integrasi kantor / QGIS

- **Ambil data lapangan:** `GET /projects/<id>/features.geojson` (perlu header
  `Authorization: Bearer <token>`) — bisa langsung dibuka di QGIS.
- **Kirim data ke lapangan:** `POST /projects/<id>/push` dengan body GeoJSON
  FeatureCollection; perangkat lapangan menerimanya saat sync berikutnya.

## Catatan produksi

- Email kode verifikasi **belum** terkirim sungguhan (belum ada SMTP) — kode
  tampil di konsol server. Tambahkan pengiriman email di handler `/auth/google`
  (cari komentar `Belum ada SMTP`).
- Verifikasi Google memakai endpoint resmi `oauth2.googleapis.com/tokeninfo`.
- Jika dipakai lewat internet, jalankan di belakang HTTPS (reverse proxy).

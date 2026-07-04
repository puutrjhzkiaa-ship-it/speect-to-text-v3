# 🎤 Speech Texter v3.0 — Frontend + Backend

Versi ini merestrukturisasi Speech Texter menjadi **frontend** dan **backend** yang terpisah secara kode, tapi dijalankan dari **satu server Node.js** (paling gampang untuk di-deploy — cukup satu proses, satu URL, tidak perlu setting CORS antar domain).

## 🆕 Apa yang baru dari versi sebelumnya

| Sebelumnya | Sekarang |
|---|---|
| Login/register cuma disimulasikan, data hilang saat clear localStorage | **Akun asli**: password di-hash (bcrypt), sesi pakai JWT, tersimpan di database |
| Tidak ada riwayat | **Tab Riwayat baru**: semua hasil STT/TTS bisa disimpan, dilihat, dihapus, dan diekspor ke `.txt` |
| Preferensi (bahasa, kecepatan, dsb) tidak tersimpan | **Preferensi tersinkron ke akun**, otomatis ke-load di device manapun setelah login |
| Tidak ada dark mode | **Dark mode** toggle, tersimpan ke akun |
| Google Sign-In client-side saja (rawan disalahgunakan) | Token Google **diverifikasi di backend** sebelum membuat sesi |
| Semua file di satu folder datar | **Struktur `frontend/` dan `backend/` terpisah** |

Fitur inti (Speech-to-Text, Text-to-Speech, Bahasa Isyarat 4 bahasa) tetap sama seperti sebelumnya — cuma sekarang datanya beneran tersimpan.

## 📁 Struktur Proyek

```
speech-texter/
├── backend/
│   ├── server.js              # Server Express: serve frontend + API
│   ├── database.js            # Setup SQLite + skema tabel
│   ├── middleware/auth.js     # Verifikasi JWT
│   ├── routes/
│   │   ├── auth.routes.js         # /api/auth/register, /login, /google, /me
│   │   ├── history.routes.js      # /api/history (CRUD riwayat)
│   │   └── preferences.routes.js  # /api/preferences
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js       # Helper fetch + auth token
│       ├── auth.js       # Register/login/logout/Google
│       ├── app.js        # STT, TTS, Bahasa Isyarat, dark mode, preferensi
│       └── history.js    # Tab Riwayat
├── package.json           # Script bantuan di root
└── README.md
```

## 🚀 Menjalankan di Lokal

**Prasyarat**: Node.js versi 18 ke atas.

```bash
# 1. Masuk ke folder backend, install dependencies
cd backend
npm install

# 2. Salin file environment, lalu isi JWT_SECRET dengan string acak
cp .env.example .env
# edit .env, minimal isi JWT_SECRET

# 3. Jalankan server
npm start
```

Buka `http://localhost:3000` — server ini otomatis serve frontend sekaligus API-nya, jadi tidak ada masalah CORS/404 seperti sebelumnya (semua satu origin).

### Google Sign-In (opsional)
Kalau mau aktifkan tombol Google, isi `GOOGLE_CLIENT_ID` di `.env` dengan Client ID dari [Google Cloud Console](https://console.cloud.google.com/). Kalau dikosongkan, tombol Google otomatis tidak muncul dan login manual (email/password) tetap berfungsi normal.

## 🌐 Rekomendasi Hosting

Backend ini pakai **SQLite** (file database lokal), jadi butuh platform dengan **disk yang persisten** — bukan serverless functions.

| Platform | Cocok? | Catatan |
|---|---|---|
| **Render.com** | ✅ Cocok | Free tier tersedia, tapi disk di free tier bisa reset saat redeploy — pakai paid plan + persistent disk untuk data jangka panjang |
| **Railway.app** | ✅ Cocok | Mudah, mendukung volume persisten |
| **Fly.io** | ✅ Cocok | Mendukung volume persisten, cocok untuk SQLite produksi |
| VPS (DigitalOcean, dll) | ✅ Cocok | Kontrol penuh |
| Vercel / Netlify (serverless functions) | ❌ Jangan | Filesystem sementara (ephemeral) — file `.db` akan hilang setiap cold start |
| Static hosting (GitHub Pages, Netlify static) | ❌ Jangan | Tidak bisa menjalankan proses Node.js sama sekali |

### Langkah deploy umum (Render/Railway/Fly)
1. Push seluruh folder `speech-texter/` ke repo Git.
2. Di dashboard platform, buat **Web Service** baru, arahkan ke repo ini.
3. **Build command**: `npm install --prefix backend`
4. **Start command**: `npm start` (atau `node backend/server.js`)
5. Set environment variables: `JWT_SECRET` (wajib), `GOOGLE_CLIENT_ID` (opsional).
6. Kalau platform mendukung, pasang **persistent volume** dan arahkan `DB_PATH` ke path di volume tersebut, supaya data tidak hilang saat redeploy.

## 🔐 Environment Variables

Lihat `backend/.env.example` untuk daftar lengkap. Yang wajib diisi hanya `JWT_SECRET`.

## 🗄️ Skema Database (SQLite)

- **users** — akun (email+password ter-hash, atau via Google)
- **preferences** — pengaturan per user (bahasa, kecepatan TTS, tema, dll), 1-ke-1 dengan users
- **history** — riwayat STT/TTS per user

## 🧪 API Endpoints Ringkas

```
POST   /api/auth/register        { name, email, password }
POST   /api/auth/login           { email, password }
POST   /api/auth/google          { credential }
GET    /api/auth/me              (butuh token)

GET    /api/history?type=stt|tts (butuh token)
POST   /api/history              { type, language, content }
DELETE /api/history/:id
DELETE /api/history              (hapus semua)

GET    /api/preferences
PUT    /api/preferences          { ...field yang ingin diubah }

GET    /api/config               { googleEnabled, googleClientId }
GET    /api/health
```

## ⚠️ Batasan yang Perlu Diketahui

- Speech Recognition & Speech Synthesis tetap memakai **Web Speech API bawaan browser** (Chrome/Edge paling stabil), bukan API pihak ketiga — jadi kualitas & bahasa yang didukung tergantung browser pengguna, sama seperti versi sebelumnya.
- SQLite cocok untuk skala kecil–menengah. Kalau nanti butuh banyak pengguna bersamaan, tinggal ganti `database.js` untuk pakai PostgreSQL/MySQL — struktur route tidak perlu diubah banyak karena query sudah terpisah rapi di satu file.

---
**Versi**: 3.0.0 — restrukturisasi frontend/backend + fitur baru

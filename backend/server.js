// server.js
// Server tunggal: serve frontend (static files) + API (/api/...).
// Ini bikin deploy jadi 1 target saja (1 repo, 1 proses, 1 URL).

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET belum diset di .env — server tidak akan dijalankan.');
  process.exit(1);
}

const authRoutes = require('./routes/auth.routes');
const historyRoutes = require('./routes/history.routes');
const preferencesRoutes = require('./routes/preferences.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

// ======================
// MIDDLEWARE
// ======================
app.use(helmet({
  contentSecurityPolicy: false, // dinonaktifkan karena kita load Google Sign-In script eksternal
}));

const corsOrigin = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*'
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : true;
app.use(cors({ origin: corsOrigin }));

app.use(express.json({ limit: '1mb' }));

// Batasi percobaan login/register agar tidak brute-force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan. Coba lagi dalam beberapa menit.' },
});

// ======================
// API ROUTES
// ======================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/preferences', preferencesRoutes);

// Beri tahu frontend apakah Google Sign-In aktif.
// Catatan: Google Client ID BUKAN rahasia (memang didesain untuk dipakai di frontend),
// yang rahasia adalah Client Secret — dan itu tidak pernah dikirim ke sini.
app.get('/api/config', (req, res) => {
  res.json({
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID),
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

// ======================
// FRONTEND (STATIC FILES)
// ======================
app.use(express.static(FRONTEND_DIR));

// Fallback: request non-API yang tidak match file statis -> index.html (SPA-friendly)
app.get(/^(?!\/api\/).*/, (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

// ======================
// ERROR HANDLER
// ======================
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log(`🚀 Speech Texter server jalan di http://localhost:${PORT}`);
});

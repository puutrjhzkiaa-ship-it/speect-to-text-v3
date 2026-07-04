// routes/auth.routes.js
const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, email: row.email, picture: row.picture };
}

function createDefaultPreferences(userId) {
  db.prepare(`INSERT INTO preferences (user_id) VALUES (?)`).run(userId);
}

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nama, email, dan password wajib diisi.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password minimal 8 karakter.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email sudah terdaftar. Silakan login.' });
  }

  const id = crypto.randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)`
  ).run(id, name.trim(), email.toLowerCase().trim(), passwordHash);
  createDefaultPreferences(id);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const token = signToken(id);
  res.status(201).json({ token, user: publicUser(user) });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user || !user.password_hash || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email atau password salah.' });
  }

  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

// POST /api/auth/google  { credential: "<google id_token>" }
router.post('/google', async (req, res) => {
  if (!googleClient) {
    return res.status(503).json({ error: 'Google Sign-In belum dikonfigurasi di server (GOOGLE_CLIENT_ID kosong).' });
  }
  const { credential } = req.body || {};
  if (!credential) {
    return res.status(400).json({ error: 'Token Google tidak ditemukan.' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email.toLowerCase();

    let user = db.prepare('SELECT * FROM users WHERE google_id = ? OR email = ?').get(googleId, email);

    if (!user) {
      const id = crypto.randomUUID();
      db.prepare(
        `INSERT INTO users (id, name, email, google_id, picture) VALUES (?, ?, ?, ?, ?)`
      ).run(id, payload.name || email, email, googleId, payload.picture || null);
      createDefaultPreferences(id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else if (!user.google_id) {
      db.prepare('UPDATE users SET google_id = ?, picture = ? WHERE id = ?').run(googleId, payload.picture || null, user.id);
    }

    const token = signToken(user.id);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Google verify error:', err.message);
    res.status(401).json({ error: 'Verifikasi Google gagal.' });
  }
});

// GET /api/auth/me  -> user yang sedang login (dipakai untuk restore session)
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!user) return res.status(404).json({ error: 'User tidak ditemukan.' });
  res.json({ user: publicUser(user) });
});

module.exports = router;

// routes/history.routes.js
const express = require('express');
const crypto = require('crypto');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/history?type=stt|tts  -> daftar riwayat milik user (terbaru dulu)
router.get('/', (req, res) => {
  const { type } = req.query;
  let rows;
  if (type === 'stt' || type === 'tts') {
    rows = db.prepare(
      'SELECT * FROM history WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 200'
    ).all(req.userId, type);
  } else {
    rows = db.prepare(
      'SELECT * FROM history WHERE user_id = ? ORDER BY created_at DESC LIMIT 200'
    ).all(req.userId);
  }
  res.json({ history: rows });
});

// POST /api/history  { type, language, content }
router.post('/', (req, res) => {
  const { type, language, content } = req.body || {};
  if (!type || !['stt', 'tts'].includes(type)) {
    return res.status(400).json({ error: "Field 'type' harus 'stt' atau 'tts'." });
  }
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Konten tidak boleh kosong.' });
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO history (id, user_id, type, language, content) VALUES (?, ?, ?, ?, ?)'
  ).run(id, req.userId, type, language || null, content.trim().slice(0, 5000));

  const row = db.prepare('SELECT * FROM history WHERE id = ?').get(id);
  res.status(201).json({ item: row });
});

// DELETE /api/history/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM history WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Item riwayat tidak ditemukan.' });
  }
  res.json({ deleted: true });
});

// DELETE /api/history  -> hapus semua riwayat milik user
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM history WHERE user_id = ?').run(req.userId);
  res.json({ deleted: true });
});

module.exports = router;

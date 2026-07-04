// routes/preferences.routes.js
const express = require('express');
const db = require('../database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const ALLOWED_FIELDS = [
  'stt_language',
  'tts_language',
  'tts_rate',
  'tts_pitch',
  'tts_volume',
  'sign_language',
  'theme',
  'font_size',
];

// GET /api/preferences
router.get('/', (req, res) => {
  let row = db.prepare('SELECT * FROM preferences WHERE user_id = ?').get(req.userId);
  if (!row) {
    db.prepare('INSERT INTO preferences (user_id) VALUES (?)').run(req.userId);
    row = db.prepare('SELECT * FROM preferences WHERE user_id = ?').get(req.userId);
  }
  res.json({ preferences: row });
});

// PUT /api/preferences  (partial update, kirim hanya field yang berubah)
router.put('/', (req, res) => {
  const updates = req.body || {};
  const fields = Object.keys(updates).filter((k) => ALLOWED_FIELDS.includes(k));

  if (fields.length === 0) {
    return res.status(400).json({ error: 'Tidak ada field valid untuk di-update.' });
  }

  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  const params = { user_id: req.userId };
  fields.forEach((f) => { params[f] = updates[f]; });

  db.prepare('INSERT OR IGNORE INTO preferences (user_id) VALUES (@user_id)').run(params);
  db.prepare(`UPDATE preferences SET ${setClause}, updated_at = datetime('now') WHERE user_id = @user_id`).run(params);

  const row = db.prepare('SELECT * FROM preferences WHERE user_id = ?').get(req.userId);
  res.json({ preferences: row });
});

module.exports = router;

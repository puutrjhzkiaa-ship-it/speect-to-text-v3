// database.js
// Setup koneksi SQLite + membuat tabel jika belum ada.
// Menggunakan better-sqlite3 (synchronous, ringan, cocok untuk skala kecil-menengah).

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'speech-texter.db');

// Pastikan folder data ada
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ======================
// SCHEMA
// ======================

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT,            -- NULL jika user daftar via Google saja
    google_id     TEXT UNIQUE,
    picture       TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS preferences (
    user_id        TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    stt_language   TEXT DEFAULT 'id-ID',
    tts_language   TEXT DEFAULT 'id-ID',
    tts_rate       REAL DEFAULT 1.0,
    tts_pitch      REAL DEFAULT 1.0,
    tts_volume     REAL DEFAULT 1.0,
    sign_language  TEXT DEFAULT 'ASL',
    theme          TEXT DEFAULT 'light',
    font_size      TEXT DEFAULT 'medium',
    updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS history (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL CHECK (type IN ('stt', 'tts')),
    language    TEXT,
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id, created_at DESC);
`);

module.exports = db;

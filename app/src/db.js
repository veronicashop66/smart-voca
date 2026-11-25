// 2026-11-25 - smart-voca - SQLite 연결과 테이블 생성 (VOCA-NFR-002·003)
// 파일 위치: app/src/db.js

const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password_hash TEXT,
  is_guest INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  daily_count INTEGER NOT NULL DEFAULT 20,
  review_percent INTEGER NOT NULL DEFAULT 30,
  quiz_count INTEGER NOT NULL DEFAULT 10,
  quiz_direction TEXT NOT NULL DEFAULT 'mix',
  quiz_format TEXT NOT NULL DEFAULT 'choice',
  is_public INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  norm TEXT NOT NULL UNIQUE,
  meaning TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS study_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_id INTEGER NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  studied_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  UNIQUE (user_id, word_id, day)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  format TEXT NOT NULL,
  total INTEGER NOT NULL,
  correct INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  submitted_at TEXT
);

CREATE TABLE IF NOT EXISTS quiz_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  idx INTEGER NOT NULL,
  word_id INTEGER REFERENCES words(id) ON DELETE SET NULL,
  word_text TEXT NOT NULL,
  meaning_text TEXT NOT NULL,
  direction TEXT NOT NULL,
  format TEXT NOT NULL,
  choices_json TEXT,
  user_answer TEXT,
  is_correct INTEGER
);

CREATE INDEX IF NOT EXISTS idx_study_user_day ON study_log (user_id, day);
CREATE INDEX IF NOT EXISTS idx_quiz_items_word ON quiz_items (word_id);
`;

// dbPath가 ':memory:'면 메모리 DB를 쓴다 (테스트용). 그 밖의 경로는 폴더가 없으면 만든다.
function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDatabase };

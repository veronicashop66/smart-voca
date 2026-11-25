// 2026-11-25 - smart-voca - 계정·세션·비밀번호 해시 (FR-041~043, ADR-010)
// 파일 위치: app/src/services/accounts.js

const crypto = require('crypto');
const { parseCookies } = require('../http');

const SESSION_COOKIE = 'voca_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
const SCRYPT_KEY_LENGTH = 64;

// 세션 키는 환경변수 SECRET_KEY에서 받는다. 없으면 서버 시작 때 무작위로 만든다 (재시작하면 로그인이 풀린다).
// DB에는 세션 토큰 자체가 아니라 이 키로 만든 HMAC만 저장하므로, DB가 새도 쿠키를 만들 수 없다.
const SECRET_KEY = process.env.SECRET_KEY || crypto.randomBytes(32).toString('hex');

function hashToken(token) {
  return crypto.createHmac('sha256', SECRET_KEY).update(String(token)).digest('hex');
}

// scrypt와 무작위 salt로 해시한다. 저장 형식: scrypt$salt$hash
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
  return 'scrypt$' + salt + '$' + hash;
}

function verifyPassword(password, stored) {
  const [scheme, salt, hashHex] = String(stored ?? '').split('$');
  if (scheme !== 'scrypt' || !salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

function createUser(db, { username, passwordHash, isGuest }) {
  const result = db
    .prepare('INSERT INTO users (username, password_hash, is_guest) VALUES (?, ?, ?)')
    .run(username, passwordHash, isGuest ? 1 : 0);
  const userId = Number(result.lastInsertRowid);
  db.prepare('INSERT INTO user_settings (user_id) VALUES (?)').run(userId);
  return userId;
}

function createGuest(db) {
  return createUser(db, { username: null, passwordHash: null, isGuest: true });
}

function findUserByName(db, username) {
  return db.prepare('SELECT id, username, password_hash, is_guest FROM users WHERE username = ?').get(username);
}

function startSession(db, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)').run(hashToken(token), userId);
  return token;
}

function endSession(db, token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(hashToken(token));
}

function findUserBySession(db, token) {
  if (!token) return null;
  return (
    db
      .prepare(
        'SELECT u.id, u.username, u.is_guest FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?',
      )
      .get(hashToken(token)) ?? null
  );
}

function setSessionCookie(res, token) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  );
}

function readSessionToken(req) {
  return parseCookies(req)[SESSION_COOKIE] ?? null;
}

// 세션이 있으면 그 사용자를 돌려주고, 없으면 게스트 계정을 새로 만들어 세션을 건다.
// 게스트는 로그인 없이도 암기·시험 이력을 계정별로 나눠 쌓을 수 있게 하는 장치다.
function ensureUser(db, req, res) {
  const existing = findUserBySession(db, readSessionToken(req));
  if (existing) return existing;
  const guestId = createGuest(db);
  const token = startSession(db, guestId);
  setSessionCookie(res, token);
  return findUserBySession(db, token);
}

// 로그인·가입 시 이전 세션을 끊고 새 세션을 건다.
function switchSession(db, req, res, userId) {
  endSession(db, readSessionToken(req));
  setSessionCookie(res, startSession(db, userId));
}

function toPublicUser(row) {
  return { id: row.id, username: row.username ?? null, isGuest: row.is_guest === 1 };
}

module.exports = {
  SESSION_COOKIE,
  hashPassword,
  verifyPassword,
  createUser,
  createGuest,
  findUserByName,
  endSession,
  readSessionToken,
  ensureUser,
  switchSession,
  toPublicUser,
};

// 2026-11-25 - smart-voca - 인증 API (회원 가입, 로그인, 로그아웃) (FR-041·042)
// 파일 위치: app/src/api/auth.js

const { HttpError, ok, created, readJson } = require('../http');
const accounts = require('../services/accounts');

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 100;

function validateCredentials(body) {
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');
  if (!USERNAME_PATTERN.test(username)) {
    throw new HttpError(400, '아이디는 영문, 숫자, _ 를 써서 3~20자로 입력하세요');
  }
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    throw new HttpError(400, `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자로 입력하세요`);
  }
  return { username, password };
}

module.exports = (db) => [
  {
    method: 'GET',
    path: '/api/auth/me',
    handler: async ({ user }) => ok(accounts.toPublicUser(user)),
  },
  {
    method: 'POST',
    path: '/api/auth/register',
    handler: async ({ req, res, user }) => {
      const { username, password } = validateCredentials(await readJson(req));
      if (accounts.findUserByName(db, username)) {
        throw new HttpError(409, '이미 있는 아이디입니다');
      }
      const userId = accounts.createUser(db, {
        username,
        passwordHash: accounts.hashPassword(password),
        isGuest: false,
      });
      accounts.switchSession(db, req, res, userId);
      return created({ id: userId, username, isGuest: false, replacedGuestId: user.id });
    },
  },
  {
    method: 'POST',
    path: '/api/auth/login',
    handler: async ({ req, res }) => {
      const body = await readJson(req);
      const username = String(body.username ?? '').trim();
      const password = String(body.password ?? '');
      const account = accounts.findUserByName(db, username);
      const passed = account && account.password_hash && accounts.verifyPassword(password, account.password_hash);
      if (!passed) throw new HttpError(401, '아이디 또는 비밀번호가 맞지 않습니다');
      accounts.switchSession(db, req, res, account.id);
      return ok({ id: account.id, username: account.username, isGuest: false });
    },
  },
  {
    method: 'POST',
    path: '/api/auth/logout',
    handler: async ({ req, res }) => {
      accounts.endSession(db, accounts.readSessionToken(req));
      accounts.switchSession(db, req, res, accounts.createGuest(db));
      return ok({ ok: true });
    },
  },
];

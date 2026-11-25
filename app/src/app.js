// 2026-11-25 - smart-voca - HTTP 요청 라우팅 (API 목록 + 정적 파일)
// 파일 위치: app/src/app.js

const path = require('path');
const { HttpError, sendJson, serveStatic } = require('./http');
const { ensureUser } = require('./services/accounts');

const API_MODULES = [
  require('./api/auth'),
  require('./api/words'),
  require('./api/study'),
  require('./api/quiz'),
  require('./api/stats'),
];

// '/api/quiz/:id/submit' → 이름 있는 그룹을 가진 정규식
function compilePath(template) {
  const source = template.replace(/:(\w+)/g, '(?<$1>[^/]+)');
  return new RegExp(`^${source}$`);
}

function createApp({ db, publicDir = path.join(__dirname, '..', 'public') }) {
  const routes = API_MODULES.flatMap((register) => register(db)).map((route) => ({
    ...route,
    regex: compilePath(route.path),
  }));

  return async function handle(req, res) {
    try {
      const url = new URL(req.url, 'http://localhost');
      const pathname = url.pathname;

      if (!pathname.startsWith('/api/')) {
        if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(res, publicDir, pathname);
        return sendJson(res, 404, { error: '없는 경로입니다' });
      }

      const pathMatches = routes.filter((route) => route.regex.test(pathname));
      const route = pathMatches.find((candidate) => candidate.method === req.method);
      if (!route) {
        if (pathMatches.length > 0) return sendJson(res, 405, { error: '허용되지 않은 요청 방식입니다' });
        return sendJson(res, 404, { error: '없는 API입니다' });
      }

      const user = ensureUser(db, req, res);
      const params = pathname.match(route.regex).groups ?? {};
      const { status, body } = await route.handler({ req, res, db, user, params, query: url.searchParams });
      return sendJson(res, status, body);
    } catch (error) {
      if (error instanceof HttpError) return sendJson(res, error.status, { error: error.message });
      console.error(error);
      return sendJson(res, 500, { error: '서버 오류가 발생했습니다' });
    }
  };
}

module.exports = { createApp };

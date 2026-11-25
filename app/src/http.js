// 2026-11-25 - smart-voca - HTTP 공통 도구 (JSON 응답, 본문 읽기, 쿠키, 정적 파일)
// 파일 위치: app/src/http.js

const fs = require('fs');
const path = require('path');

const JSON_LIMIT_BYTES = 1024 * 1024;
const IMPORT_LIMIT_BYTES = 5 * 1024 * 1024;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function ok(body) {
  return { status: 200, body };
}

function created(body) {
  return { status: 201, body };
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(payload);
}

// 본문을 읽는다. 제한을 넘으면 413으로 거절한다.
function readBody(req, limitBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let rejected = false;
    req.on('data', (chunk) => {
      if (rejected) return;
      size += chunk.length;
      if (size > limitBytes) {
        rejected = true;
        reject(new HttpError(413, '요청 크기가 너무 큽니다'));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!rejected) resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

// JSON 본문을 읽는다. Content-Type이 JSON이 아니면 거절해 교차 사이트 폼 요청을 막는다.
async function readJson(req, limitBytes = JSON_LIMIT_BYTES) {
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    throw new HttpError(415, 'JSON 형식으로 보내야 합니다');
  }
  const text = await readBody(req, limitBytes);
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, '잘못된 JSON 형식입니다');
  }
}

function parseCookies(req) {
  const cookies = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    cookies[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return cookies;
}

// 정적 파일을 publicDir 안에서만 찾아 보낸다. 상위 폴더 접근(../)은 404로 막는다.
function serveStatic(res, publicDir, urlPath) {
  let relative;
  try {
    relative = urlPath === '/' ? 'index.html' : decodeURIComponent(urlPath).replace(/^\/+/, '');
  } catch {
    return sendJson(res, 404, { error: '없는 파일입니다' });
  }
  const root = path.resolve(publicDir);
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return sendJson(res, 404, { error: '없는 파일입니다' });
  }
  const type = MIME_TYPES[path.extname(filePath)] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(filePath).pipe(res);
}

module.exports = {
  HttpError,
  IMPORT_LIMIT_BYTES,
  ok,
  created,
  sendJson,
  readJson,
  parseCookies,
  serveStatic,
};

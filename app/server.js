// 2026-11-25 - smart-voca - 서버 진입점 (환경변수 PORT, HOST, DB_PATH)
// 파일 위치: app/server.js

const http = require('http');
const path = require('path');
const { openDatabase } = require('./src/db');
const { createApp } = require('./src/app');

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || '0.0.0.0';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'voca.db');

const db = openDatabase(DB_PATH);
const server = http.createServer(createApp({ db }));

server.listen(PORT, HOST, () => {
  console.log(`smart-voca 실행 중: http://${HOST}:${PORT} (DB: ${DB_PATH})`);
});

// 2026-11-25 - smart-voca - API 통합 테스트 (인증, 단어, 암기, 시험, 통계, 공개 설정)
// 파일 위치: app/test/api.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { openDatabase } = require('../src/db');
const { createApp } = require('../src/app');

// 테스트마다 메모리 DB와 임시 서버를 띄우고, 쿠키를 들고 다니는 간단한 클라이언트를 만든다.
async function startServer() {
  const db = openDatabase(':memory:');
  const server = http.createServer(createApp({ db }));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = () => new Promise((resolve) => server.close(resolve));
  return { db, base, close };
}

function makeClient(base) {
  let cookie = '';
  const request = async (method, path, body) => {
    const headers = {};
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await fetch(base + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const data = await res.json();
    return { status: res.status, data };
  };
  return {
    get: (path) => request('GET', path),
    post: (path, body = {}) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),
  };
}

const SAMPLE_CSV = [
  '영단어,뜻',
  'require,요구하다',
  'technology,과학기술',
  'individual,개인',
  'provide,공급하다',
  'level,"수준, 정도"',
  'Peck,쪼다',
  'peck,찌르다',
  'thus,이와 같이',
  'involve,"포함하다, 관계하다"',
  'pursue,추구하다',
  'marine,바다의',
].join('\n');

test('게스트 세션이 자동으로 만들어지고, 회원 가입하면 계정이 바뀐다', async () => {
  const { base, close } = await startServer();
  try {
    const client = makeClient(base);
    const me = await client.get('/api/auth/me');
    assert.equal(me.status, 200);
    assert.equal(me.data.isGuest, true);

    const registered = await client.post('/api/auth/register', { username: 'voca_user', password: 'password123' });
    assert.equal(registered.status, 201);
    assert.equal(registered.data.username, 'voca_user');

    const again = await client.get('/api/auth/me');
    assert.equal(again.data.username, 'voca_user');
    assert.equal(again.data.isGuest, false);

    const duplicate = await client.post('/api/auth/register', { username: 'voca_user', password: 'password123' });
    assert.equal(duplicate.status, 409);
  } finally {
    await close();
  }
});

test('로그인 실패는 401이고, 비밀번호는 해시로만 저장된다 (FR-042)', async () => {
  const { db, base, close } = await startServer();
  try {
    const client = makeClient(base);
    await client.post('/api/auth/register', { username: 'hash_check', password: 'password123' });
    const stored = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('hash_check');
    assert.ok(stored.password_hash.startsWith('scrypt$'));
    assert.ok(!stored.password_hash.includes('password123'));

    const other = makeClient(base);
    const wrong = await other.post('/api/auth/login', { username: 'hash_check', password: 'wrong-pass' });
    assert.equal(wrong.status, 401);
    const right = await other.post('/api/auth/login', { username: 'hash_check', password: 'password123' });
    assert.equal(right.status, 200);
  } finally {
    await close();
  }
});

test('단어 CSV 가져오기: 중복은 뜻을 합치고 결과 건수를 돌려준다 (FR-003)', async () => {
  const { base, close } = await startServer();
  try {
    const client = makeClient(base);
    const imported = await client.post('/api/words/import', { text: SAMPLE_CSV });
    assert.equal(imported.status, 200);
    assert.equal(imported.data.total, 11);
    assert.equal(imported.data.added, 10);
    assert.equal(imported.data.updated, 1, 'Peck과 peck은 같은 단어로 보고 뜻을 합친다');

    const list = await client.get('/api/words?q=peck');
    assert.equal(list.data.total, 1);
    assert.equal(list.data.items[0].meaning, '쪼다; 찌르다');

    const again = await client.post('/api/words/import', { text: SAMPLE_CSV });
    assert.equal(again.data.added, 0);
    assert.equal(again.data.skipped, 11);
  } finally {
    await close();
  }
});

test('단어 등록·수정·삭제: 중복은 409, 없는 번호는 404 (FR-001·002)', async () => {
  const { base, close } = await startServer();
  try {
    const client = makeClient(base);
    const created = await client.post('/api/words', { word: 'abandon', meaning: '버리다' });
    assert.equal(created.status, 201);
    const dup = await client.post('/api/words', { word: 'Abandon', meaning: '다른 뜻' });
    assert.equal(dup.status, 409);

    const updated = await client.put(`/api/words/${created.data.id}`, { word: 'abandon', meaning: '포기하다' });
    assert.equal(updated.data.meaning, '포기하다');

    const removed = await client.del(`/api/words/${created.data.id}`);
    assert.equal(removed.status, 200);
    const missing = await client.del(`/api/words/${created.data.id}`);
    assert.equal(missing.status, 404);
  } finally {
    await close();
  }
});

test('암기: 1일차 단어를 보고 완료하면 다음 날짜로 넘어간다 (FR-011·012·014)', async () => {
  const { base, close } = await startServer();
  try {
    const client = makeClient(base);
    await client.post('/api/words/import', { text: SAMPLE_CSV });
    await client.put('/api/settings', { dailyCount: 5 });

    const day1 = await client.get('/api/study/today');
    assert.equal(day1.data.day, 1);
    const newWords = day1.data.items.filter((item) => !item.isReview);
    assert.equal(newWords.length, 5);

    const wrongDay = await client.post('/api/study/complete', { day: 2, wordIds: newWords.map((w) => w.id) });
    assert.equal(wrongDay.status, 400);

    const done = await client.post('/api/study/complete', { day: 1, wordIds: newWords.map((w) => w.id) });
    assert.equal(done.status, 200);

    const day2 = await client.get('/api/study/today');
    assert.equal(day2.data.day, 2);
    assert.ok(day2.data.items.some((item) => item.isReview), '전날 단어가 복습으로 섞여야 한다');
  } finally {
    await close();
  }
});

test('시험: 출제, 채점, 이력 저장과 통계 반영 (FR-021~026, FR-031~033)', async () => {
  const { base, close } = await startServer();
  try {
    const client = makeClient(base);
    await client.post('/api/words/import', { text: SAMPLE_CSV });

    const started = await client.post('/api/quiz/start', { count: 4, direction: 'eng2kor', format: 'choice' });
    assert.equal(started.status, 200);
    assert.equal(started.data.questions.length, 4);
    for (const question of started.data.questions) {
      assert.equal(question.choices.length, 4);
      assert.ok(!('answer' in question), '정답은 출제 응답에 포함되지 않아야 한다');
    }

    const answers = started.data.questions.map((question) => ({ index: question.index, answer: question.choices[0] }));
    const submitted = await client.post(`/api/quiz/${started.data.quizId}/submit`, { answers });
    assert.equal(submitted.status, 200);
    assert.equal(submitted.data.total, 4);
    assert.equal(submitted.data.results.length, 4);

    const twice = await client.post(`/api/quiz/${started.data.quizId}/submit`, { answers });
    assert.equal(twice.status, 409);

    const stats = await client.get('/api/stats/me');
    assert.equal(stats.data.quiz.attempts, 1);
    assert.equal(stats.data.quiz.totalQuestions, 4);
    assert.equal(stats.data.quiz.totalCorrect, submitted.data.score);
    assert.equal(stats.data.progress.totalWords, 10, '같은 영단어 Peck/peck은 한 단어다');
  } finally {
    await close();
  }
});

test('시험 설정 검증: 범위를 벗어난 값은 400', async () => {
  const { base, close } = await startServer();
  try {
    const client = makeClient(base);
    await client.post('/api/words/import', { text: SAMPLE_CSV });
    const tooMany = await client.post('/api/quiz/start', { count: 500 });
    assert.equal(tooMany.status, 400);
    const badFormat = await client.post('/api/quiz/start', { format: 'ox' });
    assert.equal(badFormat.status, 400);
    const badSetting = await client.put('/api/settings', { reviewPercent: 150 });
    assert.equal(badSetting.status, 400);
  } finally {
    await close();
  }
});

test('공개 설정: 공개한 사용자의 통계만 다른 사람이 읽을 수 있다 (FR-051~053)', async () => {
  const { base, close } = await startServer();
  try {
    const owner = makeClient(base);
    await owner.post('/api/auth/register', { username: 'owner_user', password: 'password123' });
    const ownerId = (await owner.get('/api/auth/me')).data.id;

    const viewer = makeClient(base);
    await viewer.post('/api/auth/register', { username: 'viewer_user', password: 'password123' });

    const hidden = await viewer.get(`/api/users/${ownerId}/stats`);
    assert.equal(hidden.status, 404);

    await owner.put('/api/settings', { isPublic: true });
    const listed = await viewer.get('/api/users');
    assert.ok(listed.data.items.some((item) => item.username === 'owner_user'));

    const visible = await viewer.get(`/api/users/${ownerId}/stats`);
    assert.equal(visible.status, 200);
    assert.equal(visible.data.username, 'owner_user');

    const readOnly = await viewer.put(`/api/users/${ownerId}/stats`, {});
    assert.equal(readOnly.status, 405);
  } finally {
    await close();
  }
});

test('계정별 분리: 다른 계정은 내 암기 이력을 보지 못한다 (FR-043)', async () => {
  const { base, close } = await startServer();
  try {
    const first = makeClient(base);
    await first.post('/api/words/import', { text: SAMPLE_CSV });
    await first.post('/api/study/complete', {
      day: 1,
      wordIds: (await first.get('/api/study/today')).data.items.map((item) => item.id),
    });
    assert.ok((await first.get('/api/stats/me')).data.progress.memorized > 0);

    const second = makeClient(base);
    assert.equal((await second.get('/api/stats/me')).data.progress.memorized, 0);
  } finally {
    await close();
  }
});

test('정적 파일 경로는 public 밖으로 나갈 수 없다', async () => {
  const { base, close } = await startServer();
  try {
    const res = await fetch(`${base}/..%2fserver.js`);
    assert.equal(res.status, 404);
  } finally {
    await close();
  }
});

test('요청 검증: JSON이 아니면 415, 알 수 없는 API는 404', async () => {
  const { base, close } = await startServer();
  try {
    const plain = await fetch(`${base}/api/words`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: '{}',
    });
    assert.equal(plain.status, 415);
    const unknown = await fetch(`${base}/api/nothing`);
    assert.equal(unknown.status, 404);
  } finally {
    await close();
  }
});

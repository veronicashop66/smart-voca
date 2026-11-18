// 실행: node --test vocab-quiz/test/
const test = require('node:test');
const assert = require('node:assert/strict');
const VOCAB_WORDS = require('../js/words.js');
const { createSession, RETRY_GAP } = require('../js/quiz.js');

// 시드 기반 난수 (테스트 재현용)
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('단어 데이터: 모든 예문에 단어가 포함되고 예문이 2개 이상이다', () => {
  assert.ok(VOCAB_WORDS.length >= 4);
  for (const w of VOCAB_WORDS) {
    assert.ok(w.examples.length >= 2, `${w.word} 예문 부족`);
    const re = new RegExp('\\b' + escapeRe(w.word) + '\\w*', 'i');
    for (const ex of w.examples) {
      assert.match(ex, re, `${w.word}: "${ex}"에 단어가 없음`);
    }
  }
});

test('단어 데이터: 단어와 뜻이 중복되지 않는다', () => {
  const words = new Set(VOCAB_WORDS.map((w) => w.word));
  const meanings = new Set(VOCAB_WORDS.map((w) => w.meaning));
  assert.equal(words.size, VOCAB_WORDS.length);
  assert.equal(meanings.size, VOCAB_WORDS.length);
});

test('선택지는 4개이며 정답 뜻이 정확히 한 번 포함된다', () => {
  const session = createSession(VOCAB_WORDS, { rng: seeded(1) });
  for (let i = 0; i < 20; i++) {
    const q = session.next();
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options).size, 4);
    assert.equal(q.options[q.correctIndex], VOCAB_WORDS.find((w) => w.word === q.word).meaning);
    session.answer(q.correctIndex);
  }
});

test('틀린 단어는 틀린 뒤 최소 8문제 이후에 다시 나온다 (신규 단어가 남아 있는 동안)', () => {
  const session = createSession(VOCAB_WORDS, { rng: seeded(7) });
  const wrongAt = new Map(); // word -> 틀린 문제 번호
  let retriesChecked = 0;
  let q;
  for (;;) {
    const before = session.stats();
    q = session.next();
    if (!q) break;
    if (q.isRetry) {
      assert.ok(wrongAt.has(q.word), `${q.word}은 틀린 적이 없는데 재출제됨`);
      const gap = q.number - wrongAt.get(q.word) - 1;
      if (gap < RETRY_GAP) {
        // 8문제 간격을 채울 수 없는 경우는 신규 단어가 모두 나간 세션 끝부분뿐이어야 함
        assert.equal(before.remainingNew, 0, `${q.word} 간격 ${gap}: 신규 단어가 남아 있었는데 조기 출제됨`);
      }
      retriesChecked++;
    }
    // 처음 나온 단어는 3번에 1번 틀리고, 재출제는 맞힌다 (경계 조건 검증)
    const wrong = !q.isRetry && q.number % 3 === 0;
    const choice = wrong ? (q.correctIndex + 1) % 4 : q.correctIndex;
    if (wrong) wrongAt.set(q.word, q.number);
    session.answer(choice);
  }
  assert.ok(retriesChecked > 0, '재출제가 한 번도 발생하지 않음');
});

test('재출제 때는 이전에 보여준 예문이 아닌 다른 예문을 쓴다', () => {
  const session = createSession(VOCAB_WORDS, { rng: seeded(3) });
  const seen = new Map(); // word -> 보여준 예문 목록
  let q;
  let round = 0;
  while ((q = session.next())) {
    const list = seen.get(q.word) || [];
    if (q.isRetry && list.length === 1) {
      assert.notEqual(q.example, list[0], `${q.word} 재출제 예문이 같음`);
    }
    list.push(q.example);
    seen.set(q.word, list);
    // 처음 한 번은 틀리고 두 번째부터 맞힘
    session.answer(list.length === 1 ? (q.correctIndex + 1) % 4 : q.correctIndex);
    round++;
  }
  assert.ok(round > VOCAB_WORDS.length, '재출제가 없었음');
});

test('재출제 순서는 틀린 순서와 고정적으로 같지 않고 랜덤하다', () => {
  // 처음 8문제를 전부 틀리게 한 뒤, 이후 재출제되는 순서를 기록
  let differentFromMissOrder = 0;
  const seen = new Set();
  for (let seed = 1; seed <= 20; seed++) {
    const session = createSession(VOCAB_WORDS, { rng: seeded(seed * 97) });
    const missOrder = [];
    for (let i = 0; i < 8; i++) {
      const q = session.next();
      missOrder.push(q.word);
      session.answer((q.correctIndex + 1) % 4);
    }
    const retryOrder = [];
    while (retryOrder.length < 8) {
      const q = session.next();
      if (q.isRetry) retryOrder.push(q.word);
      session.answer(q.correctIndex);
    }
    seen.add(retryOrder.join(','));
    if (retryOrder.join() !== missOrder.join()) differentFromMissOrder++;
    assert.deepEqual(retryOrder.slice().sort(), missOrder.slice().sort());
  }
  assert.ok(differentFromMissOrder > 10, '대부분의 경우 틀린 순서와 같아짐');
  assert.ok(seen.size > 1, '재출제 순서가 항상 같음');
});

test('모든 단어를 맞히면 세션이 끝나고 재출제가 남지 않는다', () => {
  const session = createSession(VOCAB_WORDS, { rng: seeded(11) });
  let q;
  let count = 0;
  while ((q = session.next())) {
    count++;
    session.answer(count % 5 === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex);
    assert.ok(count < 10000, '무한 루프');
  }
  assert.ok(session.isFinished());
  const s = session.stats();
  assert.equal(s.pendingRetries, 0);
  assert.equal(s.remainingNew, 0);
  assert.equal(s.answered, count);
});

test('오답 선택지는 정답과 뜻을 하나라도 공유하지 않는다', () => {
  const split = (m) => m.split(',').map((s) => s.trim());
  const session = createSession(VOCAB_WORDS, { rng: seeded(21) });
  let q;
  let count = 0;
  while ((q = session.next()) && count < 300) {
    const correctSenses = split(q.options[q.correctIndex]);
    q.options.forEach((opt, i) => {
      if (i === q.correctIndex) return;
      const shared = split(opt).filter((s) => correctSenses.includes(s));
      assert.deepEqual(shared, [], `${q.word}: 오답 "${opt}"이 정답과 뜻이 겹침`);
    });
    session.answer(q.correctIndex);
    count++;
  }
  assert.ok(count >= VOCAB_WORDS.length, '모든 단어가 출제되지 않음');
});

test('오답 후보가 부족한 데이터는 오류를 낸다', () => {
  const words = [
    { word: 'a', meaning: '가, 나', examples: ['a b', 'a c'] },
    { word: 'b', meaning: '가', examples: ['b x', 'b y'] },
    { word: 'c', meaning: '다', examples: ['c x', 'c y'] },
    { word: 'd', meaning: '라', examples: ['d x', 'd y'] },
  ];
  assert.throws(() => createSession(words), /오답 후보가 부족/);
});

test('잘못된 입력은 오류를 낸다', () => {
  assert.throws(() => createSession(VOCAB_WORDS.slice(0, 2)), /최소 4개/);
  assert.throws(
    () => createSession([{ word: 'a', meaning: 'x', examples: ['a'] }, ...VOCAB_WORDS.slice(0, 4)]),
    /예문은 최소 2개/,
  );
  const session = createSession(VOCAB_WORDS, { rng: seeded(5) });
  assert.throws(() => session.answer(0), /답할 문제가 없습니다/);
});

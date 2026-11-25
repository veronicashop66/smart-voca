// 2026-11-25 - smart-voca - 순수 로직 단위 테스트 (CSV, 뜻 합치기, 출제, 채점, 복습)
// 파일 위치: app/test/logic.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCsv, parseVocabCsv } = require('../src/logic/csv');
const { normalizeWord, mergeMeanings, optionSegments } = require('../src/logic/text');
const { weightFor, buildChoices, isAnswerCorrect, WEIGHT } = require('../src/logic/quiz');
const { pickWeighted, shuffle } = require('../src/logic/random');
const { reviewTarget, pickReviews, totalDays } = require('../src/logic/study');

// FR-003: BOM, CRLF, 따옴표 안 쉼표를 처리한다
test('CSV: BOM과 CRLF를 처리하고 따옴표 안의 쉼표를 보존한다', () => {
  const text = '﻿영단어,뜻\r\nlevel,"수준, 정도"\r\nthus,이와 같이\r\n';
  assert.deepEqual(parseCsv(text), [
    ['영단어', '뜻'],
    ['level', '수준, 정도'],
    ['thus', '이와 같이'],
  ]);
});

test('CSV: 머리글을 건너뛰고 잘못된 행은 오류로 모은다', () => {
  const text = '영단어,뜻\nrequire,요구하다\n,빈단어\nbad,뜻,쉼표가 많음\n';
  const { entries, errors } = parseVocabCsv(text);
  assert.deepEqual(entries, [{ word: 'require', meaning: '요구하다' }]);
  assert.equal(errors.length, 2);
  assert.equal(errors[0].row, 3);
  assert.equal(errors[1].row, 4);
});

test('중복 판정: 대소문자와 앞뒤 공백을 무시하고 뜻은 ;로 합친다', () => {
  assert.equal(normalizeWord('  Peck '), 'peck');
  assert.deepEqual(mergeMeanings('쪼다', '쪼다'), { meaning: '쪼다', changed: false });
  assert.deepEqual(mergeMeanings('쪼다', '찌르다'), { meaning: '쪼다; 찌르다', changed: true });
});

test('가중치: 안 본 단어 3, 틀린 적 있는 단어 2, 나머지 1', () => {
  assert.equal(weightFor({ asked: 0, wrong: 0 }), WEIGHT.NEVER_ASKED);
  assert.equal(weightFor({ asked: 5, wrong: 1 }), WEIGHT.WRONG_BEFORE);
  assert.equal(weightFor({ asked: 5, wrong: 0 }), WEIGHT.DEFAULT);
});

test('가중치 추출은 중복 없이 count개를 뽑는다', () => {
  const items = ['a', 'b', 'c', 'd'];
  const picked = pickWeighted(items, [1, 1, 1, 1], 3, () => 0.5);
  assert.equal(picked.length, 3);
  assert.equal(new Set(picked).size, 3);
  assert.deepEqual(shuffle([1, 2, 3], () => 0.99).length, 3);
});

test('4지선다: 정답과 뜻 조각이 겹치는 보기는 제외한다', () => {
  // 정답 뜻은 '수준; 정도'. '수준'과 '정도'를 가진 후보는 모두 빠져야 한다
  const candidates = ['수준', '정도', '수준; 기준', '포함하다', '요구하다', '과학기술', '개인'];
  const choices = buildChoices('수준; 정도', candidates, () => 0.3);
  assert.ok(choices);
  assert.equal(choices.length, 4);
  assert.ok(choices.includes('수준; 정도'));
  assert.ok(!choices.includes('수준'), '정답 뜻 조각과 같은 보기는 빠져야 한다');
  assert.ok(!choices.includes('정도'), '정답 뜻 조각과 같은 보기는 빠져야 한다');
  assert.ok(!choices.includes('수준; 기준'), '정답 뜻 조각을 포함한 보기는 빠져야 한다');
});

test('보기 후보가 3개 미만이면 null을 돌려준다', () => {
  assert.equal(buildChoices('수준', ['포함하다', '개인'], () => 0.5), null);
});

test('단답 채점: 영→한은 뜻 조각 중 하나, 한→영은 영단어와 맞으면 정답', () => {
  const item = { word: 'level', meaning: '수준; 정도' };
  assert.equal(isAnswerCorrect({ format: 'short', direction: 'eng2kor', ...item, answer: ' 정도 ' }), true);
  assert.equal(isAnswerCorrect({ format: 'short', direction: 'eng2kor', ...item, answer: '수준 정도' }), false);
  assert.equal(isAnswerCorrect({ format: 'short', direction: 'kor2eng', ...item, answer: 'LEVEL' }), true);
  assert.equal(isAnswerCorrect({ format: 'short', direction: 'kor2eng', ...item, answer: '' }), false);
});

test('4지선다 채점은 보기 문자열이 정확히 같아야 정답이다', () => {
  const item = { word: 'level', meaning: '수준; 정도' };
  assert.equal(isAnswerCorrect({ format: 'choice', direction: 'eng2kor', ...item, answer: '수준; 정도' }), true);
  assert.equal(isAnswerCorrect({ format: 'choice', direction: 'eng2kor', ...item, answer: '정도' }), false);
});

test('복습 선택: 직전 일차 단어가 먼저, 새 단어와 중복되지 않는다', () => {
  const picked = pickReviews(
    { previousDay: [1, 2], wrongProne: [5], studied: [1, 2, 3, 4, 5, 9], excludeIds: [9], target: 3 },
    () => 0.5,
  );
  assert.equal(picked.length, 3);
  assert.ok(!picked.includes(9));
  assert.equal(new Set(picked).size, 3);
  assert.ok(picked.slice(0, 2).every((id) => [1, 2].includes(id)));
});

test('진도 계산: 복습 개수와 전체 일차', () => {
  assert.equal(reviewTarget(20, 30), 6);
  assert.equal(reviewTarget(20, 0), 0);
  assert.equal(totalDays(2000, 20), 100);
  assert.equal(totalDays(21, 20), 2);
});

test('optionSegments: 뜻은 조각으로 나누고 소문자로 맞춘다', () => {
  assert.deepEqual(optionSegments('Level; 수준 '), ['level', '수준']);
});

// 2026-11-25 - smart-voca - 시험 출제·채점 순수 로직 (FR-021~025, ADR-008·009)
// 파일 위치: app/src/logic/quiz.js

const { normalizeWord, optionSegments } = require('./text');
const { shuffle } = require('./random');

const WEIGHT = { NEVER_ASKED: 3, WRONG_BEFORE: 2, DEFAULT: 1 };
const CHOICE_COUNT = 4;
const DISTRACTOR_COUNT = CHOICE_COUNT - 1;

// 시험 본 적 없는 단어 > 틀린 적 있는 단어 > 나머지 순으로 자주 나온다 (ADR-008 4번).
function weightFor(stat) {
  if (!stat || stat.asked === 0) return WEIGHT.NEVER_ASKED;
  if (stat.wrong > 0) return WEIGHT.WRONG_BEFORE;
  return WEIGHT.DEFAULT;
}

// 4지선다 보기를 만든다. 정답과 뜻이 겹치는 후보는 뺀다 (ADR-005의 원칙을 웹 앱에 맞춤).
// 후보가 부족하면 null을 돌려준다.
function buildChoices(correctText, candidateTexts, rng = Math.random) {
  const correctSegments = optionSegments(correctText);
  const seen = new Set();
  const usable = [];
  for (const text of candidateTexts) {
    if (text === correctText || seen.has(text)) continue;
    if (optionSegments(text).some((segment) => correctSegments.includes(segment))) continue;
    seen.add(text);
    usable.push(text);
  }
  if (usable.length < DISTRACTOR_COUNT) return null;
  const distractors = shuffle(usable, rng).slice(0, DISTRACTOR_COUNT);
  return shuffle([correctText, ...distractors], rng);
}

// direction: 'eng2kor'(영→한) | 'kor2eng'(한→영)
function promptText(direction, word, meaning) {
  return direction === 'eng2kor' ? word : meaning;
}

function correctAnswerText(direction, word, meaning) {
  return direction === 'eng2kor' ? meaning : word;
}

// 저장된 단어·뜻 기준으로 답을 판정한다.
// 4지선다는 보기 문자열이 정확히 같아야 하고, 단답형은 뜻 조각 중 하나 또는 영단어와 맞으면 정답이다.
function isAnswerCorrect({ format, direction, word, meaning, answer }) {
  const given = String(answer ?? '');
  if (format === 'choice') return given === correctAnswerText(direction, word, meaning);
  const normalized = normalizeWord(given);
  if (!normalized) return false;
  if (direction === 'eng2kor') return optionSegments(meaning).includes(normalized);
  return normalized === normalizeWord(word);
}

module.exports = {
  WEIGHT,
  CHOICE_COUNT,
  weightFor,
  buildChoices,
  promptText,
  correctAnswerText,
  isAnswerCorrect,
};

// 2026-11-25 - smart-voca - 단어·뜻 텍스트 정규화 (중복 판정, 뜻 합치기, 정답 비교)
// 파일 위치: app/src/logic/text.js

// 같은 단어인지 판정하는 키. 앞뒤 공백과 대소문자, 연속 공백을 무시한다 (ADR-008).
function normalizeWord(word) {
  return String(word ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// 뜻은 ';'로 여러 개를 적을 수 있다.
function splitMeanings(meaning) {
  return String(meaning ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
}

// 기존 뜻에 없는 새 뜻만 뒤에 붙인다. 바뀐 게 없으면 changed가 false다.
function mergeMeanings(existing, incoming) {
  const current = splitMeanings(existing);
  const added = splitMeanings(incoming).filter((part) => !current.includes(part));
  if (added.length === 0) return { meaning: existing, changed: false };
  return { meaning: [...current, ...added].join('; '), changed: true };
}

// 보기끼리 뜻이 겹치는지 검사할 때 쓰는 조각 목록.
function optionSegments(text) {
  return splitMeanings(text).map(normalizeWord);
}

module.exports = { normalizeWord, splitMeanings, mergeMeanings, optionSegments };

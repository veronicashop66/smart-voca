// 2026-11-25 - smart-voca - 암기 진도 계산 (FR-011~013, ADR-008 2~3번)
// 파일 위치: app/src/logic/study.js

const { shuffle } = require('./random');

// 일차별 단어 묶음. 단어 id 순서대로 dailyCount개씩 끊는다.
function dayOffset(day, dailyCount) {
  return (day - 1) * dailyCount;
}

function totalDays(totalWords, dailyCount) {
  return Math.ceil(totalWords / dailyCount);
}

// 오늘 복습 단어 수. 하루 학습량 × 복습 비율(%)의 내림값.
function reviewTarget(dailyCount, reviewPercent) {
  return Math.floor((dailyCount * reviewPercent) / 100);
}

// 복습 후보를 우선순위 순서대로 모은다.
// 1) 직전 일차에 외운 단어 2) 자주 틀린 단어 3) 그 밖에 이미 외운 단어. 같은 단어는 한 번만 넣는다.
function pickReviews({ previousDay, wrongProne, studied, excludeIds, target }, rng = Math.random) {
  const excluded = new Set(excludeIds);
  const picked = [];
  const taken = new Set();
  const addFrom = (ids) => {
    for (const id of shuffle(ids, rng)) {
      if (picked.length >= target) return;
      if (excluded.has(id) || taken.has(id)) continue;
      taken.add(id);
      picked.push(id);
    }
  };
  addFrom(previousDay);
  addFrom(wrongProne.filter((id) => studied.includes(id)));
  addFrom(studied);
  return picked;
}

module.exports = { dayOffset, totalDays, reviewTarget, pickReviews };

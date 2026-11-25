// 2026-11-25 - smart-voca - 사용자 설정 저장과 검증 (FR-061·062)
// 파일 위치: app/src/services/settings.js

const { HttpError } = require('../http');

function intRange(min, max, label) {
  return (value) => {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new HttpError(400, `${label}은(는) ${min}~${max} 사이의 정수여야 합니다`);
    }
    return value;
  };
}

function oneOf(allowed, label) {
  return (value) => {
    if (!allowed.includes(value)) throw new HttpError(400, `${label} 값이 올바르지 않습니다`);
    return value;
  };
}

function bool(value) {
  if (typeof value !== 'boolean') throw new HttpError(400, '공개 설정은 true 또는 false여야 합니다');
  return value ? 1 : 0;
}

// API 필드 이름 → DB 열 이름과 검증 함수
const FIELDS = {
  dailyCount: { column: 'daily_count', validate: intRange(1, 100, '하루 학습량') },
  reviewPercent: { column: 'review_percent', validate: intRange(0, 100, '복습 비율') },
  quizCount: { column: 'quiz_count', validate: intRange(1, 100, '시험 문제 수') },
  quizDirection: { column: 'quiz_direction', validate: oneOf(['eng2kor', 'kor2eng', 'mix'], '출제 방향') },
  quizFormat: { column: 'quiz_format', validate: oneOf(['choice', 'short'], '출제 형식') },
  isPublic: { column: 'is_public', validate: bool },
};

function getSettings(db, userId) {
  const row = db.prepare('SELECT * FROM user_settings WHERE user_id = ?').get(userId);
  if (!row) throw new HttpError(404, '설정을 찾을 수 없습니다');
  return {
    dailyCount: row.daily_count,
    reviewPercent: row.review_percent,
    quizCount: row.quiz_count,
    quizDirection: row.quiz_direction,
    quizFormat: row.quiz_format,
    isPublic: row.is_public === 1,
  };
}

// 보낸 필드만 검증해서 저장한다. 알 수 없는 필드는 무시한다.
function updateSettings(db, userId, patch) {
  const assignments = [];
  const values = [];
  for (const [key, spec] of Object.entries(FIELDS)) {
    if (!(key in patch)) continue;
    assignments.push(`${spec.column} = ?`);
    values.push(spec.validate(patch[key]));
  }
  if (assignments.length === 0) throw new HttpError(400, '바꿀 설정이 없습니다');
  db.prepare(`UPDATE user_settings SET ${assignments.join(', ')} WHERE user_id = ?`).run(...values, userId);
  return getSettings(db, userId);
}

module.exports = { getSettings, updateSettings, intRange, oneOf };

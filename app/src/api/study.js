// 2026-11-25 - smart-voca - 암기 API (오늘 학습 목록, 완료 기록) (FR-011~014)
// 파일 위치: app/src/api/study.js

const { HttpError, ok, readJson } = require('../http');
const { shuffle } = require('../logic/random');
const { dayOffset, totalDays, reviewTarget, pickReviews } = require('../logic/study');
const { getSettings } = require('../services/settings');

// 오늘 할 일: 다음 일차의 새 단어와, 복습 단어를 섞어 돌려준다.
function buildToday(db, userId) {
  const settings = getSettings(db, userId);
  const { dailyCount, reviewPercent } = settings;
  const totalWords = db.prepare('SELECT COUNT(*) AS n FROM words').get().n;
  const lastDay = db.prepare('SELECT MAX(day) AS day FROM study_log WHERE user_id = ?').get(userId).day ?? 0;
  const day = lastDay + 1;
  const dayCount = totalDays(totalWords, dailyCount);

  if (totalWords === 0) return { day, totalDays: 0, dailyCount, finished: true, items: [] };
  if (day > dayCount) return { day, totalDays: dayCount, dailyCount, finished: true, items: [] };

  const newWords = db
    .prepare('SELECT id, word, meaning FROM words ORDER BY id LIMIT ? OFFSET ?')
    .all(dailyCount, dayOffset(day, dailyCount))
    .map((row) => ({ ...row, isReview: false }));
  const newIds = newWords.map((row) => row.id);

  const studiedRows = db
    .prepare(
      'SELECT DISTINCT w.id, w.word, w.meaning FROM study_log s JOIN words w ON w.id = s.word_id WHERE s.user_id = ?',
    )
    .all(userId);
  const studied = studiedRows.map((row) => row.id);
  const previousDay = db
    .prepare('SELECT word_id FROM study_log WHERE user_id = ? AND day = ?')
    .all(userId, lastDay)
    .map((row) => row.word_id);
  const wrongProne = db
    .prepare(
      `SELECT qi.word_id FROM quiz_items qi JOIN quizzes q ON q.id = qi.quiz_id
       WHERE q.user_id = ? AND q.submitted_at IS NOT NULL AND qi.is_correct = 0 AND qi.word_id IS NOT NULL
       GROUP BY qi.word_id ORDER BY COUNT(*) DESC LIMIT 50`,
    )
    .all(userId)
    .map((row) => row.word_id);

  const reviewIds = pickReviews({
    previousDay,
    wrongProne,
    studied,
    excludeIds: newIds,
    target: reviewTarget(dailyCount, reviewPercent),
  });
  const byId = new Map(studiedRows.map((row) => [row.id, row]));
  const reviews = reviewIds.map((id) => ({ ...byId.get(id), isReview: true }));

  return {
    day,
    totalDays: dayCount,
    dailyCount,
    finished: false,
    items: shuffle([...newWords, ...reviews]),
  };
}

module.exports = (db) => [
  {
    method: 'GET',
    path: '/api/study/today',
    handler: async ({ user }) => ok(buildToday(db, user.id)),
  },
  {
    method: 'POST',
    path: '/api/study/complete',
    handler: async ({ req, user }) => {
      const body = await readJson(req);
      const today = buildToday(db, user.id);
      if (today.finished) throw new HttpError(409, '남은 학습 일차가 없습니다');
      if (Number(body.day) !== today.day) throw new HttpError(400, '오늘 학습 일차와 맞지 않습니다');
      const wordIds = Array.isArray(body.wordIds) ? body.wordIds.map(Number) : [];
      if (!wordIds.every((id) => Number.isInteger(id) && id > 0)) {
        throw new HttpError(400, '단어 번호가 올바르지 않습니다');
      }
      const insert = db.prepare('INSERT OR IGNORE INTO study_log (user_id, word_id, day) VALUES (?, ?, ?)');
      db.exec('BEGIN');
      try {
        for (const wordId of new Set(wordIds)) insert.run(user.id, wordId, today.day);
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return ok({ day: today.day, recorded: new Set(wordIds).size });
    },
  },
];

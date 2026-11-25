// 2026-11-25 - smart-voca - 학습 통계·설정·공개 사용자 API (FR-031~034, FR-051~053, FR-061·062)
// 파일 위치: app/src/api/stats.js

const { HttpError, ok, readJson } = require('../http');
const { totalDays } = require('../logic/study');
const { getSettings, updateSettings } = require('../services/settings');

const RECENT_QUIZ_LIMIT = 30;
const TOP_WRONG_LIMIT = 10;

// 한 사용자의 학습 진척 통계. DB 이력으로만 계산한다 (FR-034).
function summarize(db, userId) {
  const settings = getSettings(db, userId);
  const totalWords = db.prepare('SELECT COUNT(*) AS n FROM words').get().n;
  const memorized = db.prepare('SELECT COUNT(DISTINCT word_id) AS n FROM study_log WHERE user_id = ?').get(userId).n;
  const currentDay = db.prepare('SELECT MAX(day) AS day FROM study_log WHERE user_id = ?').get(userId).day ?? 0;

  const overall = db
    .prepare('SELECT COALESCE(SUM(correct), 0) AS correct, COALESCE(SUM(total), 0) AS total FROM quizzes WHERE user_id = ? AND submitted_at IS NOT NULL')
    .get(userId);
  const recentQuizzes = db
    .prepare(
      `SELECT id, direction, format, total, correct, submitted_at AS submittedAt
       FROM quizzes WHERE user_id = ? AND submitted_at IS NOT NULL ORDER BY id DESC LIMIT ?`,
    )
    .all(userId, RECENT_QUIZ_LIMIT);
  const topWrong = db
    .prepare(
      `SELECT qi.word_text AS word, qi.meaning_text AS meaning, COUNT(*) AS wrongCount
       FROM quiz_items qi JOIN quizzes q ON q.id = qi.quiz_id
       WHERE q.user_id = ? AND q.submitted_at IS NOT NULL AND qi.is_correct = 0
       GROUP BY qi.word_text, qi.meaning_text ORDER BY wrongCount DESC, qi.word_text LIMIT ?`,
    )
    .all(userId, TOP_WRONG_LIMIT);

  return {
    progress: {
      memorized,
      totalWords,
      currentDay,
      totalDays: totalDays(totalWords, settings.dailyCount),
      dailyCount: settings.dailyCount,
    },
    quiz: {
      attempts: recentQuizzes.length,
      totalQuestions: overall.total,
      totalCorrect: overall.correct,
      accuracy: overall.total > 0 ? Math.round((overall.correct / overall.total) * 1000) / 10 : null,
      recent: recentQuizzes,
    },
    topWrong,
  };
}

module.exports = (db) => [
  {
    method: 'GET',
    path: '/api/stats/me',
    handler: async ({ user }) => ok(summarize(db, user.id)),
  },
  {
    method: 'GET',
    path: '/api/settings',
    handler: async ({ user }) => ok(getSettings(db, user.id)),
  },
  {
    method: 'PUT',
    path: '/api/settings',
    handler: async ({ req, user }) => ok(updateSettings(db, user.id, await readJson(req))),
  },
  {
    method: 'GET',
    path: '/api/users',
    handler: async ({ user }) => {
      const items = db
        .prepare(
          `SELECT u.id, u.username FROM users u JOIN user_settings s ON s.user_id = u.id
           WHERE s.is_public = 1 AND u.is_guest = 0 ORDER BY u.username`,
        )
        .all()
        .map((row) => ({ ...row, isMe: row.id === user.id }));
      return ok({ items });
    },
  },
  {
    method: 'GET',
    path: '/api/users/:id/stats',
    handler: async ({ params }) => {
      const id = Number(params.id);
      const target = db
        .prepare(
          `SELECT u.id, u.username, u.is_guest, s.is_public FROM users u
           JOIN user_settings s ON s.user_id = u.id WHERE u.id = ?`,
        )
        .get(Number.isInteger(id) ? id : -1);
      // 비공개와 없는 사용자를 같은 메시지로 응답해, 아이디 존재 여부가 드러나지 않게 한다.
      if (!target || target.is_guest === 1 || target.is_public !== 1) {
        throw new HttpError(404, '공개되지 않은 사용자입니다');
      }
      return ok({ username: target.username, ...summarize(db, target.id) });
    },
  },
];

// 2026-11-25 - smart-voca - 시험 API (출제, 채점, 이력 저장) (FR-021~026)
// 파일 위치: app/src/api/quiz.js

const { HttpError, ok, readJson } = require('../http');
const { pickWeighted } = require('../logic/random');
const {
  weightFor,
  buildChoices,
  promptText,
  correctAnswerText,
  isAnswerCorrect,
} = require('../logic/quiz');
const { getSettings, intRange, oneOf } = require('../services/settings');

const DIRECTIONS = ['eng2kor', 'kor2eng', 'mix'];
const FORMATS = ['choice', 'short'];
const CANDIDATE_SAMPLE = 80;

// 사용자별 출제 가중치를 계산할 단어 목록 (제출된 시험 기준)
function loadPool(db, userId) {
  return db
    .prepare(
      `SELECT w.id, w.word, w.meaning, COALESCE(a.asked, 0) AS asked, COALESCE(a.wrong, 0) AS wrong
       FROM words w
       LEFT JOIN (
         SELECT qi.word_id, COUNT(*) AS asked, SUM(CASE WHEN qi.is_correct = 0 THEN 1 ELSE 0 END) AS wrong
         FROM quiz_items qi JOIN quizzes q ON q.id = qi.quiz_id
         WHERE q.user_id = ? AND q.submitted_at IS NOT NULL
         GROUP BY qi.word_id
       ) a ON a.word_id = w.id
       ORDER BY w.id`,
    )
    .all(userId);
}

function startQuiz(db, userId, options) {
  const pool = loadPool(db, userId);
  if (pool.length === 0) throw new HttpError(400, '등록된 단어가 없습니다. 먼저 단어를 등록하세요');

  const picked = pickWeighted(pool, pool.map(weightFor), Math.min(options.count, pool.length));
  const sampleStmt = db.prepare(
    `SELECT word, meaning FROM words WHERE id != ? ORDER BY RANDOM() LIMIT ${CANDIDATE_SAMPLE}`,
  );

  const items = picked.map((row) => {
    const direction =
      options.direction === 'mix' ? (Math.random() < 0.5 ? 'eng2kor' : 'kor2eng') : options.direction;
    let choices = null;
    if (options.format === 'choice') {
      const correct = correctAnswerText(direction, row.word, row.meaning);
      const candidates = sampleStmt
        .all(row.id)
        .map((candidate) => (direction === 'eng2kor' ? candidate.meaning : candidate.word));
      choices = buildChoices(correct, candidates);
      if (!choices) throw new HttpError(400, '보기를 만들 단어가 부족합니다. 단어를 더 등록하세요');
    }
    return { wordId: row.id, word: row.word, meaning: row.meaning, direction, choices };
  });

  db.exec('BEGIN');
  try {
    const quizId = Number(
      db
        .prepare('INSERT INTO quizzes (user_id, direction, format, total) VALUES (?, ?, ?, ?)')
        .run(userId, options.direction, options.format, items.length).lastInsertRowid,
    );
    const insertItem = db.prepare(
      `INSERT INTO quiz_items (quiz_id, idx, word_id, word_text, meaning_text, direction, format, choices_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    items.forEach((item, index) => {
      insertItem.run(
        quizId,
        index,
        item.wordId,
        item.word,
        item.meaning,
        item.direction,
        options.format,
        item.choices ? JSON.stringify(item.choices) : null,
      );
    });
    db.exec('COMMIT');

    const questions = items.map((item, index) => ({
      index,
      direction: item.direction,
      format: options.format,
      prompt: promptText(item.direction, item.word, item.meaning),
      choices: item.choices,
    }));
    return { quizId, total: items.length, questions };
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

function submitQuiz(db, userId, quizId, answers) {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ? AND user_id = ?').get(quizId, userId);
  if (!quiz) throw new HttpError(404, '시험을 찾을 수 없습니다');
  if (quiz.submitted_at) throw new HttpError(409, '이미 제출된 시험입니다');

  const answerByIndex = new Map(answers.map((entry) => [Number(entry.index), String(entry.answer ?? '')]));
  const items = db.prepare('SELECT * FROM quiz_items WHERE quiz_id = ? ORDER BY idx').all(quizId);
  const updateItem = db.prepare('UPDATE quiz_items SET user_answer = ?, is_correct = ? WHERE id = ?');

  const results = [];
  let correctCount = 0;
  db.exec('BEGIN');
  try {
    for (const item of items) {
      const yourAnswer = answerByIndex.get(item.idx) ?? '';
      const correct = isAnswerCorrect({
        format: item.format,
        direction: item.direction,
        word: item.word_text,
        meaning: item.meaning_text,
        answer: yourAnswer,
      });
      if (correct) correctCount++;
      updateItem.run(yourAnswer, correct ? 1 : 0, item.id);
      results.push({
        index: item.idx,
        direction: item.direction,
        prompt: promptText(item.direction, item.word_text, item.meaning_text),
        yourAnswer,
        correctAnswer: correctAnswerText(item.direction, item.word_text, item.meaning_text),
        correct,
      });
    }
    db.prepare("UPDATE quizzes SET correct = ?, submitted_at = datetime('now', 'localtime') WHERE id = ?").run(
      correctCount,
      quizId,
    );
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return { score: correctCount, total: items.length, results };
}

// 요청 값이 없으면 설정의 기본값을 쓴다.
function resolveOptions(body, settings) {
  const count = body.count ?? settings.quizCount;
  const direction = body.direction ?? settings.quizDirection;
  const format = body.format ?? settings.quizFormat;
  return {
    count: intRange(1, 100, '시험 문제 수')(Number(count)),
    direction: oneOf(DIRECTIONS, '출제 방향')(direction),
    format: oneOf(FORMATS, '출제 형식')(format),
  };
}

module.exports = (db) => [
  {
    method: 'POST',
    path: '/api/quiz/start',
    handler: async ({ req, user }) => {
      const body = await readJson(req);
      const options = resolveOptions(body, getSettings(db, user.id));
      return ok(startQuiz(db, user.id, options));
    },
  },
  {
    method: 'POST',
    path: '/api/quiz/:id/submit',
    handler: async ({ req, user, params }) => {
      const quizId = Number(params.id);
      if (!Number.isInteger(quizId) || quizId < 1) throw new HttpError(400, '잘못된 시험 번호입니다');
      const body = await readJson(req);
      const answers = Array.isArray(body.answers) ? body.answers : [];
      return ok(submitQuiz(db, user.id, quizId, answers));
    },
  },
];

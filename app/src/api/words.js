// 2026-11-25 - smart-voca - 단어 등록·수정·삭제·검색·CSV 가져오기 API (FR-001~004, FR-003 중복 규칙)
// 파일 위치: app/src/api/words.js

const { HttpError, ok, created, readJson, IMPORT_LIMIT_BYTES } = require('../http');
const { normalizeWord, mergeMeanings } = require('../logic/text');
const { parseVocabCsv } = require('../logic/csv');

const WORD_MAX = 100;
const MEANING_MAX = 300;
const PAGE_MAX = 100;

function validateEntry(body) {
  const word = String(body.word ?? '').trim().replace(/\s+/g, ' ');
  const meaning = String(body.meaning ?? '').trim().replace(/\s+/g, ' ');
  if (!word || word.length > WORD_MAX) throw new HttpError(400, `영단어는 1~${WORD_MAX}자로 입력하세요`);
  if (!meaning || meaning.length > MEANING_MAX) throw new HttpError(400, `뜻은 1~${MEANING_MAX}자로 입력하세요`);
  return { word, meaning };
}

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, '잘못된 단어 번호입니다');
  return id;
}

// CSV 한 번에 들어온 단어를 DB에 합친다. 같은 영단어는 뜻만 합치고, 뜻도 같으면 건너뛴다.
function importEntries(db, entries) {
  const findByNorm = db.prepare('SELECT id, meaning FROM words WHERE norm = ?');
  const insert = db.prepare('INSERT INTO words (word, norm, meaning) VALUES (?, ?, ?)');
  const update = db.prepare("UPDATE words SET meaning = ?, updated_at = datetime('now', 'localtime') WHERE id = ?");
  const result = { added: 0, updated: 0, skipped: 0 };

  db.exec('BEGIN');
  try {
    for (const { word, meaning } of entries) {
      const norm = normalizeWord(word);
      const row = findByNorm.get(norm);
      if (!row) {
        insert.run(word, norm, meaning);
        result.added++;
        continue;
      }
      const merged = mergeMeanings(row.meaning, meaning);
      if (merged.changed) {
        update.run(merged.meaning, row.id);
        result.updated++;
      } else {
        result.skipped++;
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return result;
}

module.exports = (db) => [
  {
    method: 'GET',
    path: '/api/words',
    handler: async ({ query }) => {
      const q = String(query.get('q') ?? '').trim();
      const limit = Math.min(Math.max(Number(query.get('limit')) || 50, 1), PAGE_MAX);
      const offset = Math.max(Number(query.get('offset')) || 0, 0);
      const pattern = `%${q.replace(/[\\%_]/g, (ch) => '\\' + ch)}%`;
      const where = q ? "WHERE word LIKE ? ESCAPE '\\' OR meaning LIKE ? ESCAPE '\\'" : '';
      const params = q ? [pattern, pattern] : [];
      const total = db.prepare(`SELECT COUNT(*) AS n FROM words ${where}`).get(...params).n;
      const items = db
        .prepare(`SELECT id, word, meaning FROM words ${where} ORDER BY id LIMIT ? OFFSET ?`)
        .all(...params, limit, offset);
      return ok({ total, items });
    },
  },
  {
    method: 'POST',
    path: '/api/words',
    handler: async ({ req }) => {
      const { word, meaning } = validateEntry(await readJson(req));
      const norm = normalizeWord(word);
      if (db.prepare('SELECT id FROM words WHERE norm = ?').get(norm)) {
        throw new HttpError(409, '이미 등록된 단어입니다. 뜻을 고치려면 수정을 쓰세요');
      }
      const result = db.prepare('INSERT INTO words (word, norm, meaning) VALUES (?, ?, ?)').run(word, norm, meaning);
      return created({ id: Number(result.lastInsertRowid), word, meaning });
    },
  },
  {
    method: 'PUT',
    path: '/api/words/:id',
    handler: async ({ req, params }) => {
      const id = parseId(params.id);
      const { word, meaning } = validateEntry(await readJson(req));
      const norm = normalizeWord(word);
      const clash = db.prepare('SELECT id FROM words WHERE norm = ? AND id != ?').get(norm, id);
      if (clash) throw new HttpError(409, '같은 영단어가 이미 있습니다');
      const changed = db
        .prepare("UPDATE words SET word = ?, norm = ?, meaning = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
        .run(word, norm, meaning, id);
      if (changed.changes === 0) throw new HttpError(404, '단어를 찾을 수 없습니다');
      return ok({ id, word, meaning });
    },
  },
  {
    method: 'DELETE',
    path: '/api/words/:id',
    handler: async ({ params }) => {
      const changed = db.prepare('DELETE FROM words WHERE id = ?').run(parseId(params.id));
      if (changed.changes === 0) throw new HttpError(404, '단어를 찾을 수 없습니다');
      return ok({ ok: true });
    },
  },
  {
    method: 'POST',
    path: '/api/words/import',
    handler: async ({ req }) => {
      const body = await readJson(req, IMPORT_LIMIT_BYTES);
      if (typeof body.text !== 'string' || !body.text.trim()) {
        throw new HttpError(400, 'CSV 내용이 비어 있습니다');
      }
      const { entries, errors } = parseVocabCsv(body.text);
      const counts = importEntries(db, entries);
      return ok({ total: entries.length, ...counts, errors });
    },
  },
];

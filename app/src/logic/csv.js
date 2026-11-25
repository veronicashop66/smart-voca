// 2026-11-25 - smart-voca - 단어 CSV 해석 (따옴표, BOM, CRLF 처리, FR-003)
// 파일 위치: app/src/logic/csv.js

const { splitMeanings } = require('./text');

// RFC 4180 형식의 CSV를 행 배열로 바꾼다. 따옴표 안의 쉼표와 줄바꿈을 보존한다.
function parseCsv(text) {
  const source = String(text ?? '').replace(/^﻿/, '');
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => !(cells.length === 1 && cells[0].trim() === ''));
}

// 「영단어,뜻」 형식의 CSV를 단어 목록으로 바꾼다. 잘못된 행은 errors에 모은다.
function parseVocabCsv(text) {
  const rows = parseCsv(text);
  const entries = [];
  const errors = [];

  rows.forEach((cells, index) => {
    const rowNumber = index + 1;
    const word = String(cells[0] ?? '').trim();
    const meaning = String(cells[1] ?? '').trim().replace(/\s+/g, ' ');

    if (index === 0 && /^(영단어|word)$/i.test(word)) return; // 머리글 행은 건너뛴다
    if (cells.length !== 2) {
      errors.push({ row: rowNumber, reason: '열이 2개가 아님 (뜻에 쉼표가 있으면 큰따옴표로 감싸세요)' });
      return;
    }
    if (!word || splitMeanings(meaning).length === 0) {
      errors.push({ row: rowNumber, reason: '영단어 또는 뜻이 비어 있음' });
      return;
    }
    entries.push({ word, meaning });
  });

  return { entries, errors };
}

module.exports = { parseCsv, parseVocabCsv };

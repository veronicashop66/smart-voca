// 2026-11-25 - smart-voca - 시험 화면 (출제 설정, 문제 풀이, 채점 결과) (FR-021~025)
// 파일 위치: app/public/js/views/quiz.js

import { h, message } from '../dom.js';
import { api } from '../api.js';

const DIRECTION_LABELS = { eng2kor: '영 → 한', kor2eng: '한 → 영', mix: '섞기' };
const FORMAT_LABELS = { choice: '4지선다', short: '단답형' };

function selectField(options, value) {
  return h(
    'select',
    null,
    Object.entries(options).map(([key, label]) => h('option', { value: key, selected: key === value }, label)),
  );
}

function renderSetup(main, settings) {
  const count = h('input', { type: 'number', min: 1, max: 100, value: settings.quizCount, style: 'width: 80px' });
  const direction = selectField(DIRECTION_LABELS, settings.quizDirection);
  const format = selectField(FORMAT_LABELS, settings.quizFormat);
  const error = h('div');
  const start = h('button', { class: 'primary' }, '시험 시작');
  start.addEventListener('click', async () => {
    start.disabled = true;
    error.replaceChildren();
    try {
      const quiz = await api('POST', '/api/quiz/start', {
        count: Number(count.value),
        direction: direction.value,
        format: format.value,
      });
      renderQuestions(main, quiz);
    } catch (err) {
      start.disabled = false;
      error.replaceChildren(message(err.message, 'error'));
    }
  });

  main.replaceChildren(
    h(
      'div',
      { class: 'panel' },
      h('h2', null, '시험 설정'),
      h('div', { class: 'row' }, h('label', null, '문제 수 ', count)),
      h('div', { class: 'row' }, h('label', null, '출제 방향 ', direction)),
      h('div', { class: 'row' }, h('label', null, '출제 형식 ', format)),
      h('div', { class: 'row' }, start),
      error,
    ),
  );
}

function questionInput(question) {
  const name = `q${question.index}`;
  if (question.choices) {
    return h(
      'div',
      { class: 'choices' },
      question.choices.map((choice) =>
        h('label', null, h('input', { type: 'radio', name, value: choice }), choice),
      ),
    );
  }
  return h('input', { type: 'text', name, autocomplete: 'off', 'aria-label': `${question.index + 1}번 답` });
}

function renderQuestions(main, quiz) {
  const submit = h('button', { class: 'primary' }, '제출');
  const error = h('div');
  const form = h(
    'div',
    { class: 'panel' },
    h('h2', null, `시험 (${quiz.total}문제)`),
    quiz.questions.map((question) =>
      h(
        'div',
        { class: 'question' },
        h('p', null, `${question.index + 1}. `, h('strong', null, question.prompt), h('span', { class: 'muted' }, `  (${DIRECTION_LABELS[question.direction]})`)),
        questionInput(question),
      ),
    ),
    h('div', { class: 'row' }, submit),
    error,
  );
  submit.addEventListener('click', async () => {
    const answers = quiz.questions.map((question) => {
      const name = `q${question.index}`;
      if (question.choices) {
        const picked = form.querySelector(`input[name="${name}"]:checked`);
        return { index: question.index, answer: picked ? picked.value : '' };
      }
      return { index: question.index, answer: form.querySelector(`input[name="${name}"]`).value };
    });
    submit.disabled = true;
    try {
      const result = await api('POST', `/api/quiz/${quiz.quizId}/submit`, { answers });
      renderResult(main, result);
    } catch (err) {
      submit.disabled = false;
      error.replaceChildren(message(err.message, 'error'));
    }
  });
  main.replaceChildren(form);
}

function renderResult(main, result) {
  const rows = result.results.map((row) =>
    h(
      'tr',
      null,
      h('td', null, String(row.index + 1)),
      h('td', null, row.prompt),
      h('td', { class: row.correct ? 'correct' : 'wrong' }, row.correct ? 'O' : 'X'),
      h('td', null, row.yourAnswer || '(무응답)'),
      h('td', null, row.correctAnswer),
    ),
  );
  const again = h('button', { class: 'primary' }, '다시 풀기');
  again.addEventListener('click', () => renderQuiz(main));
  main.replaceChildren(
    h(
      'div',
      { class: 'panel' },
      h('h2', null, `점수 ${result.score} / ${result.total}`),
      h(
        'table',
        null,
        h('thead', null, h('tr', null, h('th', null, '번호'), h('th', null, '문제'), h('th', null, '정오'), h('th', null, '내 답'), h('th', null, '정답'))),
        h('tbody', null, rows),
      ),
      h('div', { class: 'row' }, again),
    ),
  );
}

export async function renderQuiz(main) {
  const settings = await api('GET', '/api/settings');
  renderSetup(main, settings);
}

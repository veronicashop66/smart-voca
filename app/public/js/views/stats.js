// 2026-11-25 - smart-voca - 학습 진척 통계 화면 (FR-031~034). 다른 사용자 통계도 같은 블록을 쓴다.
// 파일 위치: app/public/js/views/stats.js

import { h, message } from '../dom.js';
import { api } from '../api.js';

const DIRECTION_LABELS = { eng2kor: '영 → 한', kor2eng: '한 → 영', mix: '섞기' };

// 통계 데이터를 블록으로 그린다. 읽기 전용이므로 버튼이 없다.
export function renderStatsBlock(container, data) {
  const { progress, quiz, topWrong } = data;
  const accuracy = quiz.accuracy === null ? '시험 기록 없음' : `${quiz.accuracy}%`;
  const stat = (label, value) => h('div', { class: 'stat' }, h('div', { class: 'muted' }, label), h('div', { class: 'value' }, value));

  const recentRows = quiz.recent.map((row) =>
    h(
      'tr',
      null,
      h('td', null, row.submittedAt),
      h('td', null, DIRECTION_LABELS[row.direction] ?? row.direction),
      h('td', null, `${row.correct} / ${row.total}`),
    ),
  );
  const wrongRows = topWrong.map((row) =>
    h('tr', null, h('td', null, row.word), h('td', null, row.meaning), h('td', null, `${row.wrongCount}회`)),
  );

  container.replaceChildren(
    h(
      'div',
      null,
      h(
        'div',
        { class: 'stats-grid' },
        stat('암기한 단어', `${progress.memorized} / ${progress.totalWords}`),
        stat('현재 일차', `${progress.currentDay} / ${progress.totalDays}`),
        stat('시험 정답률', accuracy),
        stat('푼 시험 수', String(quiz.attempts)),
      ),
      h('div', { class: 'panel' }, h('h2', null, '최근 시험'), recentRows.length
        ? h('table', null, h('thead', null, h('tr', null, h('th', null, '제출 시각'), h('th', null, '방향'), h('th', null, '점수'))), h('tbody', null, recentRows))
        : message('아직 제출한 시험이 없습니다.')),
      h('div', { class: 'panel' }, h('h2', null, '자주 틀리는 단어'), wrongRows.length
        ? h('table', null, h('thead', null, h('tr', null, h('th', null, '영단어'), h('th', null, '뜻'), h('th', null, '틀린 횟수'))), h('tbody', null, wrongRows))
        : message('틀린 단어가 없습니다.')),
    ),
  );
}

export async function renderStats(main) {
  const data = await api('GET', '/api/stats/me');
  const container = h('div');
  main.replaceChildren(h('h2', null, '학습 통계'), container);
  renderStatsBlock(container, data);
}

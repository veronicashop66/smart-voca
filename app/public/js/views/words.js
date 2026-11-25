// 2026-11-25 - smart-voca - 단어 화면 (검색·목록, 등록, 수정·삭제, CSV 가져오기) (FR-001~004)
// 파일 위치: app/public/js/views/words.js

import { h, message } from '../dom.js';
import { api } from '../api.js';

const PAGE_SIZE = 50;

export async function renderWords(main) {
  const state = { q: '', offset: 0 };
  const feedback = h('div');
  const listBox = h('div');
  const pager = h('div', { class: 'row' });

  const showFeedback = (node) => feedback.replaceChildren(node);

  async function loadList() {
    const params = new URLSearchParams({ q: state.q, offset: state.offset, limit: PAGE_SIZE });
    const data = await api('GET', `/api/words?${params}`);
    const rows = data.items.map((item) => editableRow(item));
    listBox.replaceChildren(
      data.items.length === 0
        ? message('단어가 없습니다.')
        : h(
            'table',
            null,
            h('thead', null, h('tr', null, h('th', null, '영단어'), h('th', null, '뜻'), h('th', null, ''))),
            h('tbody', null, rows),
          ),
    );
    const prev = h('button', { disabled: state.offset === 0 }, '이전');
    const next = h('button', { disabled: state.offset + PAGE_SIZE >= data.total }, '다음');
    prev.addEventListener('click', () => { state.offset = Math.max(0, state.offset - PAGE_SIZE); loadList(); });
    next.addEventListener('click', () => { state.offset += PAGE_SIZE; loadList(); });
    const from = data.total === 0 ? 0 : state.offset + 1;
    const to = Math.min(state.offset + PAGE_SIZE, data.total);
    pager.replaceChildren(prev, h('span', { class: 'muted' }, `${from}–${to} / 전체 ${data.total}개`), next);
  }

  function editableRow(item) {
    const show = () =>
      h(
        'tr',
        null,
        h('td', null, item.word),
        h('td', null, item.meaning),
        h(
          'td',
          null,
          h('button', { onclick: () => edit(item) }, '수정'),
          ' ',
          h('button', { class: 'danger', onclick: () => remove(item) }, '삭제'),
        ),
      );
    return show();
  }

  function edit(item) {
    const word = h('input', { type: 'text', value: item.word });
    const meaning = h('input', { type: 'text', value: item.meaning, style: 'width: 90%' });
    const save = h('button', { class: 'primary' }, '저장');
    save.addEventListener('click', async () => {
      try {
        await api('PUT', `/api/words/${item.id}`, { word: word.value, meaning: meaning.value });
        await loadList();
      } catch (error) {
        showFeedback(message(error.message, 'error'));
      }
    });
    const row = h('tr', null, h('td', null, word), h('td', null, meaning), h('td', null, save, ' ', h('button', { onclick: loadList }, '취소')));
    const current = listBox.querySelector('tbody');
    // 편집 중이면 해당 행만 바꾼다
    const index = [...listBox.querySelectorAll('tbody tr')].findIndex((tr) => tr.cells[0].textContent === item.word);
    if (current && index >= 0) current.replaceChild(row, current.rows[index]);
  }

  async function remove(item) {
    if (!confirm(`'${item.word}' 단어를 삭제할까요? 이 단어의 암기 기록은 함께 지워지고, 시험 기록에는 단어 이름만 남습니다.`)) return;
    try {
      await api('DELETE', `/api/words/${item.id}`);
      showFeedback(message('삭제했습니다.', 'ok'));
      await loadList();
    } catch (error) {
      showFeedback(message(error.message, 'error'));
    }
  }

  const searchInput = h('input', { type: 'text', placeholder: '영단어 또는 뜻 검색', 'aria-label': '검색어' });
  const search = h('button', null, '검색');
  search.addEventListener('click', () => {
    state.q = searchInput.value.trim();
    state.offset = 0;
    loadList().catch((error) => showFeedback(message(error.message, 'error')));
  });

  const addWord = h('input', { type: 'text', placeholder: '영단어', 'aria-label': '영단어' });
  const addMeaning = h('input', { type: 'text', placeholder: '뜻 (여러 개는 ;로 구분)', 'aria-label': '뜻', style: 'width: 280px' });
  const addButton = h('button', { class: 'primary' }, '등록');
  addButton.addEventListener('click', async () => {
    try {
      await api('POST', '/api/words', { word: addWord.value, meaning: addMeaning.value });
      addWord.value = '';
      addMeaning.value = '';
      showFeedback(message('등록했습니다.', 'ok'));
      await loadList();
    } catch (error) {
      showFeedback(message(error.message, 'error'));
    }
  });

  const fileInput = h('input', { type: 'file', accept: '.csv,text/csv' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await api('POST', '/api/words/import', { text });
      const errors = result.errors.slice(0, 10).map((err) => h('li', null, `${err.row}행: ${err.reason}`));
      showFeedback(
        h(
          'div',
          { class: 'msg ok' },
          `가져오기 완료: 전체 ${result.total}행, 새로 추가 ${result.added}개, 뜻 합침 ${result.updated}개, 변경 없음 ${result.skipped}개`,
          result.errors.length ? h('div', null, `건너뛴 행 ${result.errors.length}개`, h('ul', null, errors)) : null,
        ),
      );
      await loadList();
    } catch (error) {
      showFeedback(message(error.message, 'error'));
    } finally {
      fileInput.value = '';
    }
  });

  main.replaceChildren(
    h(
      'div',
      { class: 'panel' },
      h('h2', null, '단어 등록'),
      h('div', { class: 'row' }, addWord, addMeaning, addButton),
      h('div', { class: 'row' }, h('span', { class: 'muted' }, 'CSV 가져오기 (영단어,뜻 형식, 같은 영단어는 뜻을 합칩니다)'), fileInput),
    ),
    h('div', { class: 'panel' }, h('h2', null, '단어 목록'), h('div', { class: 'row' }, searchInput, search), feedback, listBox, pager),
  );
  await loadList();
}

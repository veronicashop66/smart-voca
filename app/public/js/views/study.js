// 2026-11-25 - smart-voca - 암기 화면 (오늘 단어 카드, 뜻 가리기, 완료 기록) (FR-011~014)
// 파일 위치: app/public/js/views/study.js

import { h, message } from '../dom.js';
import { api } from '../api.js';

function card(item) {
  const meaning = h('div', { class: 'meaning muted', hidden: true }, item.meaning);
  const toggle = h(
    'button',
    {
      onclick: () => {
        meaning.hidden = !meaning.hidden;
        toggle.textContent = meaning.hidden ? '뜻 보기' : '뜻 가리기';
      },
    },
    '뜻 보기',
  );
  return h(
    'div',
    { class: 'card' },
    h('span', { class: 'word' }, item.word),
    item.isReview ? h('span', { class: 'badge' }, '복습') : null,
    h('div', { class: 'row' }, toggle),
    meaning,
  );
}

export async function renderStudy(main) {
  const today = await api('GET', '/api/study/today');
  if (today.finished) {
    const text =
      today.totalDays === 0
        ? '등록된 단어가 없습니다. 단어 탭에서 CSV를 가져오세요.'
        : '모든 일차를 끝냈습니다. 설정에서 하루 학습량을 바꾸면 진도를 다시 계산합니다.';
    main.replaceChildren(h('div', { class: 'panel' }, h('h2', null, '암기'), message(text)));
    return;
  }

  const newCount = today.items.filter((item) => !item.isReview).length;
  const reviewCount = today.items.length - newCount;
  const finish = h('button', { class: 'primary' }, '오늘 암기 완료');
  finish.addEventListener('click', async () => {
    finish.disabled = true;
    try {
      const result = await api('POST', '/api/study/complete', {
        day: today.day,
        wordIds: today.items.map((item) => item.id),
      });
      main.replaceChildren(
        h('div', { class: 'panel' }, h('h2', null, '암기'), message(`${result.day}일차를 기록했습니다.`, 'ok')),
      );
    } catch (error) {
      finish.disabled = false;
      main.append(message(error.message, 'error'));
    }
  });

  main.replaceChildren(
    h(
      'div',
      { class: 'panel' },
      h('h2', null, `${today.day}일차 (전체 ${today.totalDays}일)`),
      h('p', { class: 'muted' }, `새 단어 ${newCount}개 · 복습 ${reviewCount}개 · 뜻을 가리고 외운 뒤 완료를 누르세요`),
      today.items.map(card),
      h('div', { class: 'row' }, finish),
    ),
  );
}

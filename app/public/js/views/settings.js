// 2026-11-25 - smart-voca - 설정 화면 (하루 학습량, 복습 비율, 시험 기본값, 공개 여부) (FR-061·062)
// 파일 위치: app/public/js/views/settings.js

import { h, message } from '../dom.js';
import { api } from '../api.js';

const DIRECTION_OPTIONS = { eng2kor: '영 → 한', kor2eng: '한 → 영', mix: '섞기' };
const FORMAT_OPTIONS = { choice: '4지선다', short: '단답형' };

function selectWith(options, value) {
  return h('select', null, Object.entries(options).map(([key, label]) => h('option', { value: key, selected: key === value }, label)));
}

export async function renderSettings(main) {
  const settings = await api('GET', '/api/settings');
  const dailyCount = h('input', { type: 'number', min: 1, max: 100, value: settings.dailyCount, style: 'width: 80px' });
  const reviewPercent = h('input', { type: 'number', min: 0, max: 100, value: settings.reviewPercent, style: 'width: 80px' });
  const quizCount = h('input', { type: 'number', min: 1, max: 100, value: settings.quizCount, style: 'width: 80px' });
  const quizDirection = selectWith(DIRECTION_OPTIONS, settings.quizDirection);
  const quizFormat = selectWith(FORMAT_OPTIONS, settings.quizFormat);
  const isPublic = h('input', { type: 'checkbox', checked: settings.isPublic });
  const feedback = h('div');
  const save = h('button', { class: 'primary' }, '저장');

  save.addEventListener('click', async () => {
    feedback.replaceChildren();
    try {
      await api('PUT', '/api/settings', {
        dailyCount: Number(dailyCount.value),
        reviewPercent: Number(reviewPercent.value),
        quizCount: Number(quizCount.value),
        quizDirection: quizDirection.value,
        quizFormat: quizFormat.value,
        isPublic: isPublic.checked,
      });
      feedback.replaceChildren(message('저장했습니다.', 'ok'));
    } catch (error) {
      feedback.replaceChildren(message(error.message, 'error'));
    }
  });

  main.replaceChildren(
    h(
      'div',
      { class: 'panel' },
      h('h2', null, '학습 설정'),
      h('div', { class: 'row' }, h('label', null, '하루 학습량(단어 수) ', dailyCount)),
      h('div', { class: 'row' }, h('label', null, '복습 비율(%) ', reviewPercent), h('span', { class: 'muted' }, '하루 암기 목록 중 복습 단어 비율')),
      h('h2', null, '시험 기본값'),
      h('div', { class: 'row' }, h('label', null, '문제 수 ', quizCount)),
      h('div', { class: 'row' }, h('label', null, '출제 방향 ', quizDirection)),
      h('div', { class: 'row' }, h('label', null, '출제 형식 ', quizFormat)),
      h('h2', null, '공개'),
      h('div', { class: 'row' }, h('label', null, isPublic, ' 다른 사용자에게 내 학습 통계 공개')),
      h('div', { class: 'row' }, save),
      feedback,
    ),
  );
}

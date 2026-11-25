// 2026-11-25 - smart-voca - 다른 사용자 이력 보기 화면 (공개 사용자 목록, 읽기 전용 통계) (FR-051~053)
// 파일 위치: app/public/js/views/users.js

import { h, message } from '../dom.js';
import { api } from '../api.js';
import { renderStatsBlock } from './stats.js';

export async function renderUsers(main) {
  const { items } = await api('GET', '/api/users');
  const detail = h('div', { class: 'panel' }, message('왼쪽에서 사용자를 고르면 학습 통계를 볼 수 있습니다.'));
  const list = items.length
    ? h(
        'div',
        { class: 'row' },
        items.map((item) => {
          const button = h('button', null, item.isMe ? `${item.username} (나)` : item.username);
          button.addEventListener('click', async () => {
            detail.replaceChildren(message('불러오는 중…'));
            try {
              const data = await api('GET', `/api/users/${item.id}/stats`);
              const box = h('div');
              detail.replaceChildren(
                h('h2', null, `${data.username} 님의 학습 통계`),
                h('p', { class: 'muted' }, '공개된 통계입니다. 수정할 수 없습니다.'),
                box,
              );
              renderStatsBlock(box, data);
            } catch (error) {
              detail.replaceChildren(message(error.message, 'error'));
            }
          });
          return button;
        }),
      )
    : message('공개로 설정한 사용자가 아직 없습니다. 설정 탭에서 본인 통계를 공개할 수 있습니다.');

  main.replaceChildren(h('div', { class: 'panel' }, h('h2', null, '다른 사용자'), list), detail);
}

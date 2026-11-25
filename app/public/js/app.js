// 2026-11-25 - smart-voca - 화면 진입점 (탭 이동, 사용자 표시)
// 파일 위치: app/public/js/app.js

import { h } from './dom.js';
import { api } from './api.js';
import { renderStudy } from './views/study.js';
import { renderQuiz } from './views/quiz.js';
import { renderWords } from './views/words.js';
import { renderStats } from './views/stats.js';
import { renderUsers } from './views/users.js';
import { renderSettings } from './views/settings.js';
import { renderAccount } from './views/account.js';

const VIEWS = {
  study: { label: '암기', render: renderStudy },
  quiz: { label: '시험', render: renderQuiz },
  words: { label: '단어', render: renderWords },
  stats: { label: '통계', render: renderStats },
  users: { label: '다른 사용자', render: renderUsers },
  settings: { label: '설정', render: renderSettings },
  account: { label: '계정', render: renderAccount },
};

const state = { user: null };

function currentTab() {
  const key = location.hash.slice(1);
  return VIEWS[key] ? key : 'study';
}

function renderNav() {
  const active = currentTab();
  const links = Object.entries(VIEWS).map(([key, view]) =>
    h('a', { href: `#${key}`, class: key === active ? 'active' : '' }, view.label),
  );
  document.getElementById('nav').replaceChildren(...links);
  document.getElementById('who').textContent = state.user.isGuest ? '게스트 (로그인 전)' : `${state.user.username} 님`;
}

async function loadUser() {
  state.user = await api('GET', '/api/auth/me');
  renderNav();
}

async function route() {
  renderNav();
  const main = document.getElementById('main');
  main.replaceChildren(h('p', { class: 'muted' }, '불러오는 중…'));
  try {
    await VIEWS[currentTab()].render(main, { user: state.user, refreshUser: loadUser });
  } catch (error) {
    main.replaceChildren(h('p', { class: 'msg error' }, error.message));
  }
}

async function start() {
  await loadUser();
  window.addEventListener('hashchange', route);
  await route();
}

start().catch((error) => {
  document.getElementById('main').replaceChildren(h('p', { class: 'msg error' }, `시작에 실패했습니다: ${error.message}`));
});

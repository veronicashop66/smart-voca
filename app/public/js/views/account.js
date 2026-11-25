// 2026-11-25 - smart-voca - 계정 화면 (회원 가입, 로그인, 로그아웃) (FR-041)
// 파일 위치: app/public/js/views/account.js

import { h, message } from '../dom.js';
import { api } from '../api.js';

function credentialForm(title, buttonLabel, path, onDone) {
  const username = h('input', { type: 'text', placeholder: '아이디 (영문, 숫자, _ 3~20자)', autocomplete: 'username' });
  const password = h('input', { type: 'password', placeholder: '비밀번호 (8자 이상)', autocomplete: 'current-password' });
  const feedback = h('div');
  const submit = h('button', { class: 'primary' }, buttonLabel);
  submit.addEventListener('click', async () => {
    feedback.replaceChildren();
    try {
      await api('POST', path, { username: username.value, password: password.value });
      await onDone();
    } catch (error) {
      feedback.replaceChildren(message(error.message, 'error'));
    }
  });
  return h('div', { class: 'panel' }, h('h2', null, title), h('div', { class: 'row' }, username, password, submit), feedback);
}

export async function renderAccount(main, { user, refreshUser }) {
  if (user.isGuest) {
    const afterLogin = async () => {
      await refreshUser();
      location.hash = '#study';
    };
    main.replaceChildren(
      h('p', { class: 'muted' }, '지금은 게스트로 사용 중입니다. 가입하거나 로그인하면 계정별로 기록이 나뉩니다.'),
      credentialForm('로그인', '로그인', '/api/auth/login', afterLogin),
      credentialForm('회원 가입', '가입하기', '/api/auth/register', afterLogin),
    );
    return;
  }

  const logout = h('button', { class: 'danger' }, '로그아웃');
  logout.addEventListener('click', async () => {
    await api('POST', '/api/auth/logout', {});
    await refreshUser();
    location.hash = '#study';
  });
  main.replaceChildren(h('div', { class: 'panel' }, h('h2', null, '계정'), h('p', null, `${user.username} 님으로 로그인 중입니다.`), h('div', { class: 'row' }, logout)));
}

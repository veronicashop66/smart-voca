// 화면 제어 (퀴즈 로직은 quiz.js 참고)
(function () {
  const $ = (id) => document.getElementById(id);
  let session = null;
  let current = null;
  let answered = false;

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 예문 속 단어(굴절형 포함)를 강조 표시. textContent로만 넣어 HTML 주입을 막습니다.
  function renderExample(el, sentence, word) {
    el.textContent = '';
    const re = new RegExp('\\b' + escapeRegExp(word) + '\\w*', 'i');
    let rest = sentence;
    let m;
    while ((m = re.exec(rest))) {
      el.appendChild(document.createTextNode(rest.slice(0, m.index)));
      const strong = document.createElement('strong');
      strong.textContent = m[0];
      el.appendChild(strong);
      rest = rest.slice(m.index + m[0].length);
    }
    el.appendChild(document.createTextNode(rest));
  }

  function showQuestion() {
    current = session.next();
    if (!current) return finish();

    const s = session.stats();
    $('progress').textContent =
      `${s.answered + 1}번째 문제 · 남은 신규 ${s.remainingNew}개 · 재출제 대기 ${s.pendingRetries}개`;
    $('tag').textContent = current.isRetry ? '다시 풀기' : '새 단어';
    renderExample($('example'), current.example, current.word);
    $('feedback').textContent = '';
    $('feedback').className = 'feedback';
    $('next').hidden = true;
    answered = false;

    const box = $('options');
    box.textContent = '';
    current.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.textContent = `${i + 1}. ${opt}`;
      btn.addEventListener('click', () => choose(i));
      box.appendChild(btn);
    });
  }

  function choose(i) {
    if (answered) return;
    answered = true;
    const result = session.answer(i);
    const buttons = $('options').querySelectorAll('button');
    buttons.forEach((b) => (b.disabled = true));
    buttons[current.correctIndex].classList.add('correct');
    if (!result.correct) buttons[i].classList.add('wrong');

    const fb = $('feedback');
    if (result.correct) {
      fb.textContent = '정답입니다!';
      fb.className = 'feedback ok';
    } else {
      fb.textContent = `오답입니다. "${result.word}" = ${result.correctMeaning}`;
      fb.className = 'feedback ng';
    }
    const next = $('next');
    next.hidden = false;
    next.textContent = session.isFinished() ? '결과 보기' : '다음';
  }

  function finish() {
    $('quiz').hidden = true;
    $('done').hidden = false;
    const s = session.stats();
    $('summary').textContent =
      `총 ${s.totalWords}개 단어 · 총 답변 ${s.answered}회 · 첫 시도 정답 ${s.firstTryCorrect}개`;
    $('progress').textContent = '';
  }

  function start() {
    session = VocabQuiz.createSession(VOCAB_WORDS);
    $('done').hidden = true;
    $('quiz').hidden = false;
    showQuestion();
  }

  $('next').addEventListener('click', () => {
    if (session.isFinished()) return finish();
    showQuestion();
  });
  $('restart').addEventListener('click', start);

  start();
})();

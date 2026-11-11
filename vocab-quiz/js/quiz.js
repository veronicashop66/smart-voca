// 뜻 맞추기 퀴즈 로직 (UI와 분리된 순수 로직)
//
// 규칙
// - 문제는 예문을 먼저 보여준 뒤 단어의 뜻을 4지선다로 고릅니다.
// - 틀린 단어는 "틀린 시점 이후 최소 8문제가 지난 뒤" 다시 출제됩니다.
//   (8문제 뒤 0~4문제 사이에서 무작위로 정해지므로 순서가 고정되지 않습니다.)
// - 같은 시점에 재출제 대상이 여럿이면 그중 랜덤하게 고릅니다.
// - 재출제 때는 이전에 보여주지 않은 다른 예문을 씁니다.
// - 맞출 때까지 계속 재출제됩니다.

(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.VocabQuiz = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  const RETRY_GAP = 8; // 틀린 뒤 최소 이 개수의 문제를 거친 후 재출제
  const RETRY_JITTER = 4; // 그 이후 0~4문제 사이 무작위로 추가 간격

  function shuffle(arr, rng) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function validateWords(words, choiceCount) {
    if (!Array.isArray(words) || words.length < choiceCount) {
      throw new Error(`단어는 최소 ${choiceCount}개 필요합니다.`);
    }
    const meanings = new Set();
    words.forEach((w) => {
      if (!w.word || !w.meaning) throw new Error('단어와 뜻이 필요합니다.');
      if (!Array.isArray(w.examples) || w.examples.length < 2) {
        throw new Error(`"${w.word}"의 예문은 최소 2개 필요합니다.`);
      }
      if (meanings.has(w.meaning)) {
        throw new Error(`뜻이 중복됩니다: "${w.meaning}"`);
      }
      meanings.add(w.meaning);
    });
  }

  function createSession(words, options = {}) {
    const rng = options.rng || Math.random;
    const choiceCount = options.choiceCount || 4;
    const retryGap = options.retryGap === undefined ? RETRY_GAP : options.retryGap;
    const retryJitter = options.retryJitter === undefined ? RETRY_JITTER : options.retryJitter;
    validateWords(words, choiceCount);

    const newQueue = shuffle(words.map((_, i) => i), rng); // 아직 처음 내지 않은 단어
    let retryQueue = []; // { index, dueAfter } : issued가 dueAfter 이상이 되면 출제 가능
    const shownExamples = words.map(() => []); // 단어별로 이미 보여준 예문 인덱스
    const firstAsked = new Set(); // 첫 출제 여부 추적
    let issued = 0; // 지금까지 출제한 문제 수
    let current = null; // 답을 기다리는 문제
    let answered = 0;
    let firstTryCorrect = 0;
    let shortGapRetries = 0; // 8문제 간격을 채우지 못하고 나온 재출제 수 (남은 단어가 부족할 때)

    function pickExample(index) {
      const w = words[index];
      const shown = shownExamples[index];
      let pool = w.examples.map((_, k) => k).filter((k) => !shown.includes(k));
      if (pool.length === 0) {
        // 예문을 모두 보여줬다면 직전 예문만 피해서 고른다
        const last = shown[shown.length - 1];
        pool = w.examples.map((_, k) => k).filter((k) => k !== last);
      }
      const k = pool[Math.floor(rng() * pool.length)];
      shown.push(k);
      return w.examples[k];
    }

    function buildChoices(index) {
      const correct = words[index].meaning;
      const others = words
        .map((w, k) => k)
        .filter((k) => k !== index)
        .map((k) => words[k].meaning);
      const distractors = shuffle(others, rng).slice(0, choiceCount - 1);
      const options = shuffle([correct, ...distractors], rng);
      return { options, correctIndex: options.indexOf(correct) };
    }

    function next() {
      if (current) return current;

      let index;
      let isRetry = false;
      const due = retryQueue.filter((r) => r.dueAfter <= issued);

      if (due.length > 0) {
        const picked = due[Math.floor(rng() * due.length)];
        retryQueue = retryQueue.filter((r) => r !== picked);
        index = picked.index;
        isRetry = true;
      } else if (newQueue.length > 0) {
        index = newQueue.shift();
      } else if (retryQueue.length > 0) {
        // 남은 문제가 재출제 대기뿐이면 8문제 간격을 채울 수 없으므로 가장 먼저 예정된 것을 냅니다.
        const earliest = retryQueue.reduce((a, b) => (b.dueAfter < a.dueAfter ? b : a));
        retryQueue = retryQueue.filter((r) => r !== earliest);
        index = earliest.index;
        isRetry = true;
        shortGapRetries += 1;
      } else {
        return null; // 모든 단어를 맞춰서 종료
      }

      issued += 1;
      const { options, correctIndex } = buildChoices(index);
      current = {
        number: issued,
        wordIndex: index,
        word: words[index].word,
        example: pickExample(index),
        options,
        correctIndex,
        isRetry,
      };
      return current;
    }

    function answer(choiceIndex) {
      if (!current) throw new Error('답할 문제가 없습니다. next()를 먼저 호출하세요.');
      const q = current;
      const correct = choiceIndex === q.correctIndex;

      answered += 1;
      if (!firstAsked.has(q.wordIndex)) {
        firstAsked.add(q.wordIndex);
        if (correct) firstTryCorrect += 1;
      }
      if (!correct) {
        // 최소 retryGap문제 뒤, 0~retryJitter문제 사이에서 무작위로 다시 출제
        const jitter = Math.floor(rng() * (retryJitter + 1));
        retryQueue.push({ index: q.wordIndex, dueAfter: q.number + retryGap + jitter });
      }
      current = null;

      return {
        correct,
        word: q.word,
        correctMeaning: q.options[q.correctIndex],
      };
    }

    function isFinished() {
      return current === null && newQueue.length === 0 && retryQueue.length === 0;
    }

    function stats() {
      return {
        totalWords: words.length,
        issued,
        answered,
        firstTryCorrect,
        pendingRetries: retryQueue.length,
        remainingNew: newQueue.length,
        shortGapRetries,
      };
    }

    return { next, answer, isFinished, stats };
  }

  return { createSession, RETRY_GAP, RETRY_JITTER, shuffle };
});

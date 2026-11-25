// 2026-11-25 - smart-voca - 무작위 도구 (셔플, 가중치 추출)
// 파일 위치: app/src/logic/random.js

// 원본을 바꾸지 않고 Fisher-Yates 방식으로 섞는다. rng를 넣으면 테스트에서 결과를 고정할 수 있다.
function shuffle(list, rng = Math.random) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 가중치에 비례해 중복 없이 count개를 뽑는다.
function pickWeighted(items, weights, count, rng = Math.random) {
  const pool = items.map((item, index) => ({ item, weight: weights[index] }));
  const picked = [];
  while (picked.length < count && pool.length > 0) {
    const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng() * total;
    let index = 0;
    while (index < pool.length - 1) {
      roll -= pool[index].weight;
      if (roll < 0) break;
      index++;
    }
    picked.push(pool[index].item);
    pool.splice(index, 1);
  }
  return picked;
}

module.exports = { shuffle, pickWeighted };

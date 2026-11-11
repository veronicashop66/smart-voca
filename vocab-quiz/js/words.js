// 수능 영어 빈출 단어 목록
// 각 단어는 뜻(meaning)과 예문(examples)을 가집니다.
// 재출제 시 같은 예문이 반복되지 않도록 단어마다 예문을 2개 이상 두세요.
const VOCAB_WORDS = [
  { word: 'abandon', meaning: '버리다, 포기하다', examples: [
    'The crew had to abandon the sinking ship.',
    'Never abandon your dreams just because the first attempt failed.',
  ] },
  { word: 'achieve', meaning: '성취하다, 달성하다', examples: [
    'She worked hard to achieve her goal of becoming a doctor.',
    'Teamwork helps us achieve results that no one could reach alone.',
  ] },
  { word: 'acquire', meaning: '얻다, 습득하다', examples: [
    'Learning a second language takes time, but anyone can acquire it.',
    'The company plans to acquire a smaller firm next year.',
  ] },
  { word: 'adequate', meaning: '충분한, 적절한', examples: [
    'The room was small, but it was adequate for two people.',
    'Make sure you get adequate sleep before the exam.',
  ] },
  { word: 'alter', meaning: '바꾸다, 변경하다', examples: [
    'The designer decided to alter the layout of the website.',
    'Weather conditions can alter the schedule of the flights.',
  ] },
  { word: 'ambiguous', meaning: '모호한, 애매한', examples: [
    'The instructions were ambiguous, so we asked for clarification.',
    'His answer was ambiguous and left everyone confused.',
  ] },
  { word: 'analyze', meaning: '분석하다', examples: [
    'Scientists analyze the data to find patterns.',
    'Students should analyze the passage before answering the questions.',
  ] },
  { word: 'anticipate', meaning: '예상하다, 기대하다', examples: [
    'We anticipate a large crowd at the festival this weekend.',
    'Experts anticipate that prices will rise next year.',
  ] },
  { word: 'assess', meaning: '가늠하다, 사정하다', examples: [
    'The teacher will assess each student\'s progress at the end of term.',
    'Doctors must assess the patient\'s condition carefully.',
  ] },
  { word: 'assume', meaning: '가정하다, 추정하다', examples: [
    'I assume you have already read the report.',
    'Do not assume that everyone shares your opinion.',
  ] },
  { word: 'bias', meaning: '편견, 편향', examples: [
    'The survey results showed a clear bias toward younger voters.',
    'Journalists should avoid bias when reporting the news.',
  ] },
  { word: 'capacity', meaning: '능력, 수용력', examples: [
    'The stadium has a capacity of fifty thousand people.',
    'She has a great capacity for understanding complex ideas.',
  ] },
  { word: 'circumstance', meaning: '상황, 환경', examples: [
    'Under no circumstances should you open the door to strangers.',
    'The success of the plan depends on the circumstances.',
  ] },
  { word: 'coincide', meaning: '동시에 일어나다, 일치하다', examples: [
    'The holiday will coincide with the start of the school year.',
    'Our interests coincide, so we work well together.',
  ] },
  { word: 'complex', meaning: '복잡한', examples: [
    'The problem is too complex to solve in a single day.',
    'The machine has a complex system of gears.',
  ] },
  { word: 'concede', meaning: '인정하다, 양보하다', examples: [
    'After a long debate, he had to concede that he was wrong.',
    'The team did not want to concede the game.',
  ] },
  { word: 'consequence', meaning: '결과, 영향', examples: [
    'Every action has consequences, both good and bad.',
    'The flood was a serious consequence of the heavy rain.',
  ] },
  { word: 'considerable', meaning: '상당한, 많은', examples: [
    'The project required considerable effort from the whole team.',
    'The new law will have a considerable impact on small businesses.',
  ] },
  { word: 'consistent', meaning: '일관된, 한결같은', examples: [
    'Her performance has been consistent throughout the season.',
    'The results are consistent with what we found last year.',
  ] },
  { word: 'constraint', meaning: '제약, 제한', examples: [
    'Budget constraints forced the company to cancel the trip.',
    'Time is a major constraint on this research.',
  ] },
  { word: 'contribute', meaning: '기여하다, 이바지하다', examples: [
    'Every member is expected to contribute ideas to the meeting.',
    'Regular exercise can contribute to better health.',
  ] },
  { word: 'convey', meaning: '전달하다', examples: [
    'The poem seems to convey a feeling of loneliness.',
    'Gestures can convey meaning without any words.',
  ] },
  { word: 'crucial', meaning: '결정적인, 매우 중요한', examples: [
    'Timing is crucial when you are negotiating a contract.',
    'Sleep plays a crucial role in memory.',
  ] },
  { word: 'decline', meaning: '감소하다, 거절하다', examples: [
    'The number of visitors began to decline in autumn.',
    'I had to decline the invitation because I was busy.',
  ] },
  { word: 'demonstrate', meaning: '보여주다, 증명하다', examples: [
    'The experiment will demonstrate how heat affects metal.',
    'She demonstrated her skills by solving every problem quickly.',
  ] },
  { word: 'deteriorate', meaning: '악화되다', examples: [
    'His health began to deteriorate after the accident.',
    'If the weather continues to deteriorate, the match will be canceled.',
  ] },
  { word: 'diminish', meaning: '줄어들다, 약화시키다', examples: [
    'The noise gradually diminished as the train moved away.',
    'Constant criticism can diminish a person\'s confidence.',
  ] },
  { word: 'distinct', meaning: '뚜렷한, 별개의', examples: [
    'There is a distinct smell of smoke in the air.',
    'The two species are distinct from each other.',
  ] },
  { word: 'dominant', meaning: '지배적인, 우세한', examples: [
    'English is the dominant language in many international meetings.',
    'The dominant color in the painting is blue.',
  ] },
  { word: 'eliminate', meaning: '제거하다, 없애다', examples: [
    'We need to eliminate errors from the final report.',
    'The first round will eliminate half of the players.',
  ] },
  { word: 'emerge', meaning: '나타나다, 드러나다', examples: [
    'A new leader emerged from the group during the crisis.',
    'The sun began to emerge from behind the clouds.',
  ] },
  { word: 'enhance', meaning: '향상시키다, 높이다', examples: [
    'Good lighting can enhance the beauty of a room.',
    'The software update aims to enhance security.',
  ] },
  { word: 'establish', meaning: '확립하다, 설립하다', examples: [
    'The company was established in 1990 in Seoul.',
    'The researchers want to establish a clear link between diet and health.',
  ] },
  { word: 'evaluate', meaning: '평가하다', examples: [
    'The committee will evaluate all the applications by Friday.',
    'Please evaluate the quality of the service.',
  ] },
  { word: 'evident', meaning: '분명한, 명백한', examples: [
    'It was evident that she was nervous during the interview.',
    'The benefits of recycling are evident to everyone.',
  ] },
  { word: 'facilitate', meaning: '촉진하다, 용이하게 하다', examples: [
    'The new software will facilitate communication between departments.',
    'A good map can facilitate travel in unfamiliar cities.',
  ] },
  { word: 'feasible', meaning: '실현 가능한', examples: [
    'Building a bridge across the river is not feasible at this time.',
    'Is it feasible to finish the project in two weeks?',
  ] },
  { word: 'fluctuate', meaning: '변동하다, 오르내리다', examples: [
    'Stock prices fluctuate from day to day.',
    'The temperature can fluctuate greatly in the desert.',
  ] },
  { word: 'generate', meaning: '생성하다, 만들어 내다', examples: [
    'Wind turbines generate electricity without producing pollution.',
    'Our new idea should generate more sales.',
  ] },
  { word: 'hinder', meaning: '방해하다', examples: [
    'Heavy snow may hinder the progress of the rescue team.',
    'Fear can hinder your ability to speak in public.',
  ] },
  { word: 'identical', meaning: '동일한, 똑같은', examples: [
    'The twins look almost identical to each other.',
    'Two answers may look identical but have different meanings.',
  ] },
  { word: 'implement', meaning: '실행하다, 시행하다', examples: [
    'The government will implement the new policy next month.',
    'We must implement the changes as soon as possible.',
  ] },
  { word: 'imply', meaning: '암시하다, 함축하다', examples: [
    'Her silence seemed to imply that she disagreed.',
    'Does this statement imply that the plan has failed?',
  ] },
  { word: 'inevitable', meaning: '불가피한, 피할 수 없는', examples: [
    'Some conflict is inevitable when people work closely together.',
    'Change is inevitable in every field of science.',
  ] },
  { word: 'infer', meaning: '추론하다, 추측하다', examples: [
    'From the clues, we can infer that the thief entered through the window.',
    'The reader must infer the meaning of the word from context.',
  ] },
  { word: 'inhibit', meaning: '억제하다, 저해하다', examples: [
    'Stress can inhibit the body\'s immune system.',
    'Fear should not inhibit you from trying new things.',
  ] },
  { word: 'maintain', meaning: '유지하다, 지속하다', examples: [
    'It is important to maintain a healthy diet.',
    'The school tries to maintain high academic standards.',
  ] },
  { word: 'modify', meaning: '수정하다, 변경하다', examples: [
    'The engineers had to modify the design after the test.',
    'You can modify the settings to suit your needs.',
  ] },
  { word: 'obvious', meaning: '명백한, 분명한', examples: [
    'The answer was obvious to everyone in the room.',
    'It is obvious that the team worked very hard.',
  ] },
  { word: 'outcome', meaning: '결과, 성과', examples: [
    'The outcome of the election surprised many people.',
    'We are waiting for the outcome of the test.',
  ] },
  { word: 'perceive', meaning: '인지하다, 지각하다', examples: [
    'Animals perceive danger through their senses.',
    'Many people perceive him as a kind and honest leader.',
  ] },
  { word: 'persist', meaning: '지속하다, 고집하다', examples: [
    'If the pain continues to persist, see a doctor.',
    'She persisted in her efforts despite many failures.',
  ] },
  { word: 'possess', meaning: '소유하다, 지니다', examples: [
    'He does not possess the skills required for this job.',
    'The museum possesses rare paintings from the 18th century.',
  ] },
  { word: 'prevalent', meaning: '널리 퍼진, 흔한', examples: [
    'The disease is most prevalent among older adults.',
    'Online shopping has become prevalent in recent years.',
  ] },
  { word: 'prohibit', meaning: '금지하다', examples: [
    'The law prohibits smoking in public buildings.',
    'Local rules prohibit the use of drones in this park.',
  ] },
  { word: 'promote', meaning: '촉진하다, 승진시키다, 홍보하다', examples: [
    'The campaign aims to promote healthy eating.',
    'She was promoted to manager after five years.',
  ] },
  { word: 'reluctant', meaning: '꺼리는, 마지못해 하는', examples: [
    'He was reluctant to share his personal opinion.',
    'The children were reluctant to leave the playground.',
  ] },
  { word: 'significant', meaning: '중요한, 상당한', examples: [
    'This discovery is a significant step in medical research.',
    'There was a significant increase in sales last month.',
  ] },
  { word: 'stimulate', meaning: '자극하다, 촉진하다', examples: [
    'Music can stimulate creativity and imagination.',
    'The new tax policy is designed to stimulate the economy.',
  ] },
  { word: 'sustain', meaning: '지속하다, 떠받치다', examples: [
    'The farm cannot sustain its current level of production.',
    'Clean water is essential to sustain life.',
  ] },
  { word: 'tendency', meaning: '경향, 성향', examples: [
    'There is a tendency to forget things that we do not review.',
    'Children have a natural tendency to imitate adults.',
  ] },
  { word: 'undergo', meaning: '겪다, 받다', examples: [
    'The old building will undergo major repairs next year.',
    'Many patients undergo surgery every day.',
  ] },
  { word: 'versatile', meaning: '다재다능한, 다용도의', examples: [
    'A good smartphone is a versatile tool for work and play.',
    'She is a versatile actress who can play almost any role.',
  ] },
  { word: 'vulnerable', meaning: '취약한, 연약한', examples: [
    'Young children are vulnerable to infections.',
    'The system is vulnerable to attacks from hackers.',
  ] },
];

// Node 테스트에서도 불러올 수 있도록 내보냅니다 (브라우저에서는 무시됨)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VOCAB_WORDS;
}

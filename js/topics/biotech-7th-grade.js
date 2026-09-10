// Question provider for the 7th-grade biotech-basics topic.
// Questions come from a curated static bank (config/topics/biotech-7th-grade.json)
// grouped into difficulty tiers; this module just picks the next one.

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createProvider(topicConfig) {
  const bank = topicConfig.questionBank;

  function formatQuestion(entry) {
    if (entry.type === 'multiple-choice') {
      const shuffled = shuffle(entry.choices.map((label, i) => ({ label, value: i })));
      return {
        id: entry.id,
        type: 'multiple-choice',
        prompt: entry.prompt,
        choices: shuffled,
        answer: entry.answerIndex,
        explanation: entry.explanation,
      };
    }
    return {
      id: entry.id,
      type: 'fill-in',
      prompt: entry.prompt,
      acceptedAnswers: entry.acceptedAnswers,
      explanation: entry.explanation,
    };
  }

  function getNextQuestion(tierIndex, recentIds = []) {
    const pool = bank.filter((q) => q.tier <= tierIndex);
    const fresh = pool.filter((q) => !recentIds.includes(q.id));
    const candidates = fresh.length > 0 ? fresh : pool;
    const entry = candidates[randInt(0, candidates.length - 1)];
    return formatQuestion(entry);
  }

  return { getNextQuestion };
}

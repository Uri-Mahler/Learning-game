// Pure game logic: scoring, streaks, leveling, answer checking.
// No DOM access here — screens call these functions and render the result.

const STREAK_BONUS_CAP = 10;
const BASE_POINTS = 10;

export function rawLevelIndex(progress, topicConfig) {
  return Math.floor(progress.points / topicConfig.pointsPerLevel);
}

export function difficultyTierIndex(progress, topicConfig) {
  return Math.min(rawLevelIndex(progress, topicConfig), topicConfig.tierCount - 1);
}

// The highest level that actually means anything: once a player's rank name
// and difficulty tier have both maxed out, there is no next chapter, so the
// bar should stop resetting and just sit full instead of cycling forever.
export function maxLevelIndex(topicConfig, themeConfig) {
  return Math.min(topicConfig.tierCount, themeConfig.levelNames.length) - 1;
}

export function displayLevelIndex(progress, topicConfig, themeConfig) {
  return Math.min(rawLevelIndex(progress, topicConfig), maxLevelIndex(topicConfig, themeConfig));
}

export function levelProgressRatio(progress, topicConfig, themeConfig) {
  const capped = maxLevelIndex(topicConfig, themeConfig);
  if (rawLevelIndex(progress, topicConfig) >= capped) return 1;
  const into = progress.points % topicConfig.pointsPerLevel;
  return into / topicConfig.pointsPerLevel;
}

export function getNextQuestion(provider, progress, topicConfig, subtopicId) {
  const tier = difficultyTierIndex(progress, topicConfig);
  const subtopic = subtopicId ? (topicConfig.subtopics || []).find((s) => s.id === subtopicId) : null;
  return provider.getNextQuestion(tier, progress.recentQuestionIds || [], subtopic);
}

function normalizeText(str) {
  return String(str).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function checkAnswer(question, userInput) {
  if (question.type === 'multiple-choice') {
    return userInput === question.answer;
  }
  if (question.type === 'match-pairs') {
    return question.pairs.every((pair) => userInput && userInput[pair.id] === pair.id);
  }
  if (question.type === 'array-builder') {
    return !!userInput && userInput.rows === question.targetRows && userInput.cols === question.targetCols;
  }
  if (question.type === 'fair-share') {
    return Array.isArray(userInput) && userInput.length === question.divisor && userInput.every((count) => count === question.answer);
  }
  if (question.type === 'fraction-build' || question.type === 'fraction-equivalent' || question.type === 'fraction-multiply') {
    return userInput === question.answer;
  }
  if (question.acceptedAnswers) {
    const normalizedInput = normalizeText(userInput);
    return question.acceptedAnswers.some((a) => normalizeText(a) === normalizedInput);
  }
  return Number(userInput) === question.answer;
}

export function applyAnswer(progress, topicConfig, themeConfig, question, userInput) {
  const correct = checkAnswer(question, userInput);
  const capped = maxLevelIndex(topicConfig, themeConfig);
  const prevLevel = Math.min(rawLevelIndex(progress, topicConfig), capped);

  const pointsAwarded = correct ? BASE_POINTS + Math.min(progress.streak, STREAK_BONUS_CAP) * 2 : 0;

  const recentQuestionIds = [question.id, ...(progress.recentQuestionIds || [])].slice(0, 6);

  const nextProgress = {
    ...progress,
    points: progress.points + pointsAwarded,
    streak: correct ? progress.streak + 1 : 0,
    bestStreak: correct ? Math.max(progress.bestStreak, progress.streak + 1) : progress.bestStreak,
    questionsAnswered: progress.questionsAnswered + 1,
    correctAnswers: progress.correctAnswers + (correct ? 1 : 0),
    lastPlayedAt: Date.now(),
    recentQuestionIds,
  };

  const newLevel = Math.min(rawLevelIndex(nextProgress, topicConfig), capped);
  const leveledUp = correct && newLevel > prevLevel;

  return { correct, pointsAwarded, leveledUp, progress: nextProgress };
}

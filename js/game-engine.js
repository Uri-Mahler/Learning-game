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

export function displayLevelIndex(progress, topicConfig, themeConfig) {
  const names = themeConfig.levelNames.length;
  return Math.min(rawLevelIndex(progress, topicConfig), names - 1);
}

export function levelProgressRatio(progress, topicConfig) {
  const into = progress.points % topicConfig.pointsPerLevel;
  return into / topicConfig.pointsPerLevel;
}

export function getNextQuestion(provider, progress, topicConfig) {
  const tier = difficultyTierIndex(progress, topicConfig);
  return provider.getNextQuestion(tier, progress.recentQuestionIds || []);
}

function normalizeText(str) {
  return String(str).trim().toLowerCase().replace(/\s+/g, ' ');
}

export function checkAnswer(question, userInput) {
  if (question.type === 'multiple-choice') {
    return userInput === question.answer;
  }
  if (question.acceptedAnswers) {
    const normalizedInput = normalizeText(userInput);
    return question.acceptedAnswers.some((a) => normalizeText(a) === normalizedInput);
  }
  return Number(userInput) === question.answer;
}

export function applyAnswer(progress, topicConfig, question, userInput) {
  const correct = checkAnswer(question, userInput);
  const prevLevel = rawLevelIndex(progress, topicConfig);

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

  const newLevel = rawLevelIndex(nextProgress, topicConfig);
  const leveledUp = correct && newLevel > prevLevel;

  return { correct, pointsAwarded, leveledUp, progress: nextProgress };
}

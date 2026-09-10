// Question provider for the 4th-grade multiplication & division topic.
// Questions are generated procedurally (not stored), scoped per level tier
// from the topic config (config/topics/multiplication-4th-grade.json).

const NAMES = ['דנה', 'יואב', 'נועה', 'איתי', 'מאיה', 'עומר', 'שירה', 'תומר', 'רוני', 'ליאור'];
const ITEMS = ['מדבקות', 'כדורים', 'עפרונות', 'ממתקים', 'קלפים', 'פרחים', 'ביצי שוקולד', 'בלונים'];
const CONTAINERS = [
  { plural: 'קופסאות', singular: 'קופסה' },
  { plural: 'שקיות', singular: 'שקית' },
  { plural: 'תיבות', singular: 'תיבה' },
  { plural: 'ארגזים', singular: 'ארגז' },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateChoices(correct) {
  const deltaPool = [1, 2, -1, -2, 5, -5, 10, -10];
  const distractors = new Set();
  let guardCount = 0;
  while (distractors.size < 3 && guardCount < 30) {
    guardCount++;
    const d = correct + pick(deltaPool);
    if (d > 0 && d !== correct) distractors.add(d);
  }
  while (distractors.size < 3) distractors.add(correct + distractors.size + 1);
  return shuffle([correct, ...distractors]).map((v) => ({ label: String(v), value: v }));
}

const HINTS = {
  mult: 'רמז: כפל הוא חיבור חוזר - אפשר לחבר את המספר הקטן שוב ושוב, כמספר הפעמים של המספר השני.',
  div: 'רמז: חילוק הוא כפל הפוך - חשבו במה צריך לכפול את המחלק כדי לקבל את המספר המחולק.',
  divRemainder: 'רמז: קודם מצאו כמה פעמים המחלק נכנס במספר במלואו - זו המנה. מה שנשאר הוא השארית.',
  multTen: 'רמז: כשכופלים ב-10, 100 או 1000 - פשוט מוסיפים לו אפסים בהתאם.',
  comparative: "רמז: \"פי X\" אומר לכפול ב-X.",
  wordProblem: 'רמז: חשבו כמה יש בקבוצה אחת, ואז כפלו במספר הקבוצות.',
  twoStep: 'רמז: קודם חשבו כמה היה בסך הכול, ואז הפחיתו את מה שנעלם.',
};

function makeFactMultiplication(maxFactor) {
  const a = randInt(2, maxFactor);
  const b = randInt(2, maxFactor);
  const answer = a * b;
  return {
    type: 'multiple-choice',
    dir: 'ltr',
    prompt: `${a} × ${b} = ?`,
    answer,
    choices: generateChoices(answer),
    explanation: HINTS.mult,
  };
}

function makeFactDivision(maxFactor) {
  const b = randInt(2, maxFactor);
  const q = randInt(2, maxFactor);
  const a = b * q;
  return {
    type: 'multiple-choice',
    dir: 'ltr',
    prompt: `${a} : ${b} = ?`,
    answer: q,
    choices: generateChoices(q),
    explanation: HINTS.div,
  };
}

function makeDivisionWithRemainder(maxFactor) {
  const b = randInt(3, maxFactor);
  const q = randInt(2, maxFactor);
  const r = randInt(1, b - 1);
  const a = b * q + r;
  const correctLabel = `מנה ${q}, שארית ${r}`;
  const distractors = new Set();
  distractors.add(`מנה ${q}, שארית ${(r + 1) % b}`);
  distractors.add(`מנה ${q - 1 >= 1 ? q - 1 : q + 1}, שארית ${r}`);
  distractors.add(`מנה ${q + 1}, שארית ${r > 1 ? r - 1 : r + 1}`);
  const choices = shuffle([correctLabel, ...distractors]).map((label) => ({ label, value: label }));
  return {
    type: 'multiple-choice',
    dir: 'ltr',
    prompt: `${a} : ${b} = ? (מנה ושארית)`,
    answer: correctLabel,
    choices,
    explanation: HINTS.divRemainder,
  };
}

function makeMultiplesOfTen(maxFactor) {
  const a = randInt(2, maxFactor);
  const power = pick([10, 100, 1000]);
  const answer = a * power;
  return {
    type: 'multiple-choice',
    dir: 'ltr',
    prompt: `${a} × ${power} = ?`,
    answer,
    choices: generateChoices(answer),
    explanation: HINTS.multTen,
  };
}

function makeComparativeWordProblem(maxFactor) {
  const [name1, name2] = shuffle(NAMES).slice(0, 2);
  const item = pick(ITEMS);
  const base = randInt(2, Math.max(2, Math.floor(maxFactor / 2)));
  const times = randInt(2, Math.min(6, maxFactor));
  const answer = base * times;
  return {
    type: 'fill-in',
    prompt: `ל${name1} יש ${base} ${item}. ל${name2} יש פי ${times} ${item} מ${name1}. כמה ${item} יש ל${name2}?`,
    answer,
    explanation: HINTS.comparative,
  };
}

function makeWordProblem(maxFactor) {
  const item = pick(ITEMS);
  const container = pick(CONTAINERS);
  const perContainer = randInt(2, maxFactor);
  const numContainers = randInt(2, maxFactor);
  const answer = perContainer * numContainers;
  return {
    type: 'fill-in',
    prompt: `בכל ${container.singular} יש ${perContainer} ${item}. יש ${numContainers} ${container.plural}. כמה ${item} יש בסך הכול?`,
    answer,
    explanation: HINTS.wordProblem,
  };
}

function makeTwoStepWordProblem(maxFactor) {
  const name = pick(NAMES);
  const item = pick(ITEMS);
  const perContainer = randInt(2, maxFactor);
  const numContainers = randInt(2, Math.max(3, Math.floor(maxFactor / 2)));
  const total = perContainer * numContainers;
  const used = randInt(1, total - 1);
  const answer = total - used;
  return {
    type: 'fill-in',
    prompt: `ל${name} היו ${numContainers} קופסאות, ובכל אחת ${perContainer} ${item}. ${name} חילק.ה ${used} ${item} לחברים. כמה ${item} נשארו ל${name}?`,
    answer,
    explanation: HINTS.twoStep,
  };
}

function makeArrayBuilder(maxFactor) {
  const cap = Math.min(maxFactor, 10);
  const rows = randInt(2, cap);
  const cols = randInt(2, cap);
  return {
    type: 'array-builder',
    dir: 'ltr',
    prompt: `בנו מערך עם ${rows} שורות ו-${cols} טורים - כמה ריבועים בסך הכול?`,
    targetRows: rows,
    targetCols: cols,
    maxSlider: cap,
    answer: rows * cols,
    explanation: HINTS.mult,
  };
}

function makeFairShare(maxFactor) {
  const divisor = randInt(2, Math.min(4, maxFactor));
  const quotient = randInt(2, Math.min(6, maxFactor));
  const dividend = divisor * quotient;
  return {
    type: 'fair-share',
    dir: 'ltr',
    prompt: `${dividend} : ${divisor} = ? גררו את כל הפריטים לקבוצות, כך שבכל קבוצה יהיה מספר שווה`,
    dividend,
    divisor,
    answer: quotient,
    explanation: HINTS.div,
  };
}

function makeFractionBuild() {
  const denominator = randInt(3, 8);
  const numerator = randInt(1, denominator - 1);
  return {
    type: 'fraction-build',
    dir: 'ltr',
    prompt: `צבעו ${numerator}/${denominator} מהצורה`,
    denominator,
    answer: numerator,
    explanation: 'רמז: לחצו על משבצות עד שתצבעו בדיוק את החלק המבוקש.',
  };
}

function makeFractionEquivalent() {
  const baseDenominator = pick([2, 3, 4]);
  const baseNumerator = randInt(1, baseDenominator - 1);
  const multiplier = pick([2, 3]);
  const targetDenominator = baseDenominator * multiplier;
  const targetNumerator = baseNumerator * multiplier;
  return {
    type: 'fraction-equivalent',
    dir: 'ltr',
    prompt: `בצורה הראשונה צבוע ${baseNumerator}/${baseDenominator}. צבעו את אותו חלק בצורה השנייה, שמחולקת ל-${targetDenominator} חלקים`,
    baseNumerator,
    baseDenominator,
    targetDenominator,
    answer: targetNumerator,
    explanation: `רמז: ${baseNumerator}/${baseDenominator} שווה ל-${targetNumerator}/${targetDenominator} - הכפילו את המונה ואת המכנה פי ${multiplier}.`,
  };
}

function makeFractionMultiply() {
  const rows = pick([2, 3, 4]);
  const shadedRows = randInt(1, rows - 1);
  const cols = pick([2, 3, 4]);
  const answerCols = randInt(1, cols - 1);
  return {
    type: 'fraction-multiply',
    dir: 'ltr',
    prompt: `כמה זה ${shadedRows}/${rows} × ${answerCols}/${cols}? לחצו על טורים כדי לצבוע ${answerCols} מתוך ${cols} - החלק הכהה המשותף הוא התשובה`,
    rows,
    cols,
    shadedRows,
    answerCols,
    answer: shadedRows * answerCols,
    explanation: `רמז: ${shadedRows}/${rows} × ${answerCols}/${cols} = ${shadedRows * answerCols}/${rows * cols} - כפל שברים הוא "חלק מתוך חלק".`,
  };
}

function pickKind(tier, subtopic) {
  if (subtopic && subtopic.kinds) return pick(subtopic.kinds);
  const kinds = ['mult', 'arrayBuilder'];
  if (tier.includeDivision) kinds.push('div', 'fairShare');
  if (tier.includeRemainder) kinds.push('divRemainder');
  if (tier.includeMultiples10) kinds.push('multTen');
  if (tier.includeComparative) kinds.push('comparative');
  if (tier.includeWordProblems) kinds.push('wordProblem');
  if (tier.includeTwoStep) kinds.push('twoStep');
  if (tier.includeFractions) kinds.push('fractionBuild', 'fractionEquivalent', 'fractionMultiply');
  return pick(kinds);
}

export function createProvider(topicConfig) {
  const tiers = topicConfig.levels;

  function buildQuestion(tierIndex, subtopic) {
    const tier = tiers[Math.min(tierIndex, tiers.length - 1)];
    const kind = pickKind(tier, subtopic);
    switch (kind) {
      case 'div':
        return makeFactDivision(tier.maxFactor);
      case 'divRemainder':
        return makeDivisionWithRemainder(tier.maxFactor);
      case 'multTen':
        return makeMultiplesOfTen(tier.maxFactor);
      case 'comparative':
        return makeComparativeWordProblem(tier.maxFactor);
      case 'wordProblem':
        return makeWordProblem(tier.maxFactor);
      case 'twoStep':
        return makeTwoStepWordProblem(tier.maxFactor);
      case 'arrayBuilder':
        return makeArrayBuilder(tier.maxFactor);
      case 'fairShare':
        return makeFairShare(tier.maxFactor);
      case 'fractionBuild':
        return makeFractionBuild();
      case 'fractionEquivalent':
        return makeFractionEquivalent();
      case 'fractionMultiply':
        return makeFractionMultiply();
      case 'mult':
      default:
        return makeFactMultiplication(tier.maxFactor);
    }
  }

  function getNextQuestion(tierIndex, recentPrompts = [], subtopic = null) {
    let question;
    let attempts = 0;
    do {
      question = buildQuestion(tierIndex, subtopic);
      attempts++;
    } while (recentPrompts.includes(question.prompt) && attempts < 6);
    return { id: question.prompt, ...question };
  }

  return { getNextQuestion };
}

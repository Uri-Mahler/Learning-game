import { h, mount, applyThemeColors } from './components.js';
import * as state from '../state.js';
import { loadQuestBundle } from '../config-loader.js';
import { getNextQuestion, applyAnswer, checkAnswer, displayLevelIndex, levelProgressRatio } from '../game-engine.js';
import { render as renderMultipleChoice } from './question-types/multiple-choice.js';
import { render as renderFillIn } from './question-types/fill-in.js';
import { render as renderMatchPairs } from './question-types/match-pairs.js';
import { render as renderArrayBuilder } from './question-types/array-builder.js';
import { render as renderFairShare } from './question-types/fair-share.js';
import { render as renderFractionBuild } from './question-types/fraction-build.js';
import { render as renderFractionEquivalent } from './question-types/fraction-equivalent.js';
import { render as renderFractionMultiply } from './question-types/fraction-multiply.js';

// Every question type is a module in ./question-types/ exporting
// render(container, question, { attemptAnswer, isAnswered }). A type only
// needs to gather user input and call attemptAnswer with it — it never
// touches scoring, persistence, or the retry/reveal flow directly. Add a
// new question kind by adding one file here and one line to this map.
const RENDERERS = {
  'multiple-choice': renderMultipleChoice,
  'fill-in': renderFillIn,
  'match-pairs': renderMatchPairs,
  'array-builder': renderArrayBuilder,
  'fair-share': renderFairShare,
  'fraction-build': renderFractionBuild,
  'fraction-equivalent': renderFractionEquivalent,
  'fraction-multiply': renderFractionMultiply,
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function renderGameScreen(root, { player, quest, subtopicId, onExit }) {
  const screen = h('div', { class: 'screen' }, [h('div', { class: 'empty-state' }, 'טוען משימה...')]);
  mount(root, screen);

  const { topicConfig, themeConfig, provider } = await loadQuestBundle(quest);
  applyThemeColors(themeConfig);

  const subtopic = subtopicId ? (topicConfig.subtopics || []).find((s) => s.id === subtopicId) : null;

  let progress = state.getProgress(player.id, quest.id);
  let currentQuestion = null;
  let answered = false;
  let retryUsed = false;
  let feedbackArea = null;

  const vocab = themeConfig.vocabulary;

  const hud = h('div', { class: 'hud' });
  const progressTrack = h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill' })]);
  const questionArea = h('div', { class: 'question-card' });

  const topBar = h('div', { class: 'top-bar' }, [
    h('div', { class: 'top-bar__player' }, [
      h('span', { class: 'top-bar__avatar' }, player.avatarEmoji),
      h('span', {}, player.name),
    ]),
    h('button', { class: 'icon-btn', type: 'button', title: vocab.menu, onclick: onExit }, '🏠'),
  ]);

  const subtopicBadge = h('div', { class: 'streak-badge subtopic-badge' }, subtopic ? `${subtopic.icon || ''} ${subtopic.name}` : '🎲 תרגול מעורב');

  const layout = h('div', { class: 'screen' }, [topBar, subtopicBadge, hud, progressTrack, questionArea]);
  mount(root, layout);

  function updateHud() {
    const levelIdx = displayLevelIndex(progress, topicConfig, themeConfig);
    const levelName = themeConfig.levelNames[levelIdx];
    hud.innerHTML = '';
    hud.appendChild(h('div', { class: 'hud__mascot' }, themeConfig.mascotEmoji));
    hud.appendChild(
      h('div', { class: 'hud__stats' }, [
        stat(progress.points, vocab.points),
        stat(progress.streak, vocab.streak, progress.streak >= 3),
        stat(levelName, vocab.level),
      ])
    );
    progressTrack.querySelector('.progress-fill').style.width = `${Math.round(levelProgressRatio(progress, topicConfig, themeConfig) * 100)}%`;
  }

  function stat(value, label, badge = false) {
    return h('div', { class: 'hud__stat' }, [
      h('div', { class: 'hud__stat-value' }, badge ? `🔥 ${value}` : String(value)),
      h('div', { class: 'hud__stat-label' }, label),
    ]);
  }

  function renderQuestion() {
    answered = false;
    retryUsed = false;
    currentQuestion = getNextQuestion(provider, progress, topicConfig, subtopicId);
    questionArea.innerHTML = '';
    questionArea.appendChild(
      h('div', { class: 'question-card__prompt', dir: currentQuestion.dir || null }, currentQuestion.prompt)
    );

    RENDERERS[currentQuestion.type](questionArea, currentQuestion, { attemptAnswer, isAnswered: () => answered });

    feedbackArea = h('div', { class: 'feedback-area' });
    questionArea.appendChild(feedbackArea);
  }

  // Shared core for every question type: peeks correctness without
  // committing, gives one hint-only retry on the first miss, and only
  // scores/reveals on the final attempt. This is the single place that
  // touches progress/scoring - question-type modules never call
  // applyAnswer or state.saveProgress themselves.
  function attemptAnswer(userInput, { onRetryVisual, onFinalVisual } = {}) {
    if (answered) return;
    const correct = checkAnswer(currentQuestion, userInput);

    if (!correct && !retryUsed) {
      retryUsed = true;
      if (onRetryVisual) onRetryVisual();
      showHint();
      return;
    }

    answered = true;
    const result = applyAnswer(progress, topicConfig, themeConfig, currentQuestion, userInput);
    progress = result.progress;
    state.saveProgress(player.id, quest.id, progress);
    updateHud();
    if (onFinalVisual) onFinalVisual(result);
    appendFeedbackAndContinue(result);
  }

  function showHint() {
    feedbackArea.innerHTML = '';
    feedbackArea.appendChild(
      h('div', { class: 'feedback feedback--wrong' }, [
        'כמעט! נסו שוב',
        currentQuestion.explanation ? h('span', { class: 'feedback__explain' }, currentQuestion.explanation) : null,
      ])
    );
  }

  function appendFeedbackAndContinue(result) {
    if (subtopicId) state.incrementSubtopicProgress(player.id, quest.id, subtopicId);
    feedbackArea.innerHTML = '';
    const feedback = h('div', { class: `feedback feedback--${result.correct ? 'correct' : 'wrong'}` }, [
      result.correct ? pick(vocab.correct) : pick(vocab.wrong),
      !result.correct && currentQuestion.type === 'fill-in' ? h('span', { class: 'reveal-answer' }, `התשובה הנכונה: ${revealFillInAnswer(currentQuestion)}`) : null,
      currentQuestion.explanation ? h('span', { class: 'feedback__explain' }, currentQuestion.explanation) : null,
    ]);

    const continueBtn = h(
      'button',
      {
        class: 'btn btn--full',
        type: 'button',
        onclick: () => {
          if (result.leveledUp) showLevelUp();
          else renderQuestion();
        },
      },
      vocab.continueBtn
    );

    feedbackArea.appendChild(feedback);
    feedbackArea.appendChild(continueBtn);
  }

  function revealFillInAnswer(question) {
    return question.acceptedAnswers ? question.acceptedAnswers[0] : question.answer;
  }

  function showLevelUp() {
    const levelIdx = displayLevelIndex(progress, topicConfig, themeConfig);
    const levelName = themeConfig.levelNames[levelIdx];
    const overlay = h('div', { class: 'overlay' }, [
      h('div', { class: 'overlay__card' }, [
        h('div', { class: 'overlay__emoji' }, themeConfig.mascotEmoji),
        h('div', {}, vocab.levelUp),
        h('div', { class: 'overlay__level-name' }, levelName),
        h(
          'button',
          {
            class: 'btn btn--accent btn--full',
            type: 'button',
            onclick: () => {
              overlay.remove();
              renderQuestion();
            },
          },
          vocab.continueBtn
        ),
      ]),
    ]);
    document.body.appendChild(overlay);
  }

  updateHud();
  renderQuestion();
}

import { h, mount, applyThemeColors } from './components.js';
import * as state from '../state.js';
import { loadQuestBundle } from '../config-loader.js';
import { getNextQuestion, applyAnswer, rawLevelIndex, displayLevelIndex, levelProgressRatio } from '../game-engine.js';

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function renderGameScreen(root, { player, quest, onExit }) {
  const screen = h('div', { class: 'screen' }, [h('div', { class: 'empty-state' }, 'טוען משימה...')]);
  mount(root, screen);

  const { topicConfig, themeConfig, provider } = await loadQuestBundle(quest);
  applyThemeColors(themeConfig);

  let progress = state.getProgress(player.id, quest.id);
  let currentQuestion = null;
  let answered = false;

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

  const layout = h('div', { class: 'screen' }, [topBar, hud, progressTrack, questionArea]);
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
    progressTrack.querySelector('.progress-fill').style.width = `${Math.round(levelProgressRatio(progress, topicConfig) * 100)}%`;
  }

  function stat(value, label, badge = false) {
    return h('div', { class: 'hud__stat' }, [
      h('div', { class: 'hud__stat-value' }, badge ? `🔥 ${value}` : String(value)),
      h('div', { class: 'hud__stat-label' }, label),
    ]);
  }

  function renderQuestion() {
    answered = false;
    currentQuestion = getNextQuestion(provider, progress, topicConfig);
    questionArea.innerHTML = '';
    questionArea.appendChild(h('div', { class: 'question-card__prompt' }, currentQuestion.prompt));

    if (currentQuestion.type === 'multiple-choice') {
      const grid = h('div', { class: 'choices-grid' });
      currentQuestion.choices.forEach((choice) => {
        const btn = h(
          'button',
          {
            class: 'choice-btn',
            type: 'button',
            onclick: () => handleAnswer(choice.value, { grid, chosenBtn: btn }),
          },
          choice.label
        );
        grid.appendChild(btn);
      });
      questionArea.appendChild(grid);
    } else {
      const input = h('input', { class: 'text-input', type: 'text', inputmode: 'numeric', placeholder: '?' });
      const submit = h('button', { class: 'btn btn--accent', type: 'button', onclick: () => handleAnswer(input.value, { input, submit }) }, 'בדוק');
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAnswer(input.value, { input, submit });
      });
      questionArea.appendChild(h('div', { class: 'fill-row' }, [input, submit]));
      setTimeout(() => input.focus(), 50);
    }
  }

  function handleAnswer(userInput, elements) {
    if (answered) return;
    answered = true;

    const result = applyAnswer(progress, topicConfig, currentQuestion, userInput);
    progress = result.progress;
    state.saveProgress(player.id, quest.id, progress);
    updateHud();

    if (elements.grid) {
      Array.from(elements.grid.children).forEach((btn) => btn.classList.add('disabled'));
      elements.chosenBtn.classList.add(result.correct ? 'correct' : 'wrong');
      markCorrectChoice(elements.grid);
    } else {
      elements.input.disabled = true;
      elements.submit.disabled = true;
    }

    const feedback = h('div', { class: `feedback feedback--${result.correct ? 'correct' : 'wrong'}` }, [
      result.correct ? pick(vocab.correct) : pick(vocab.wrong),
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

    questionArea.appendChild(feedback);
    questionArea.appendChild(continueBtn);
  }

  function markCorrectChoice(grid) {
    Array.from(grid.children).forEach((btn, i) => {
      if (currentQuestion.choices[i].value === currentQuestion.answer) btn.classList.add('correct');
    });
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

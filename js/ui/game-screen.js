import { h, mount, applyThemeColors, makeDraggable } from './components.js';
import * as state from '../state.js';
import { loadQuestBundle } from '../config-loader.js';
import { getNextQuestion, applyAnswer, checkAnswer, displayLevelIndex, levelProgressRatio } from '../game-engine.js';

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

    if (currentQuestion.type === 'multiple-choice') renderDragChoice(currentQuestion);
    else if (currentQuestion.type === 'match-pairs') renderMatchPairs(currentQuestion);
    else renderFillIn(currentQuestion);

    feedbackArea = h('div', { class: 'feedback-area' });
    questionArea.appendChild(feedbackArea);
  }

  function renderDragChoice(question) {
    const slot = h('div', { class: 'drop-slot' }, 'גררו את התשובה לכאן');
    const tileRefs = [];
    const row = h('div', { class: 'drag-row' });

    question.choices.forEach((choice) => {
      const tile = h('div', { class: 'drag-tile' }, choice.label);
      tileRefs.push({ el: tile, choice });
      const place = () => {
        if (answered) return;
        handleAnswer(choice.value, { type: 'drag', tileEl: tile, slotEl: slot, tileRefs, chosenLabel: choice.label });
      };
      makeDraggable(tile, () => [{ el: slot, id: 'slot' }], place);
      tile.addEventListener('click', place);
      row.appendChild(tile);
    });

    questionArea.appendChild(slot);
    questionArea.appendChild(row);
  }

  function renderFillIn(question) {
    const input = h('input', { class: 'text-input', type: 'text', inputmode: 'numeric', placeholder: '?' });
    const submit = h('button', { class: 'btn btn--accent', type: 'button', onclick: () => handleAnswer(input.value, { input, submit }) }, 'בדוק');
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAnswer(input.value, { input, submit });
    });
    questionArea.appendChild(h('div', { class: 'fill-row' }, [input, submit]));
    setTimeout(() => input.focus(), 50);
  }

  function renderMatchPairs(question) {
    const placements = {};
    const slotEls = {};
    const termEls = {};
    const dropTargets = [];
    let selectedTermId = null;

    function clearSelection() {
      if (selectedTermId && termEls[selectedTermId]) termEls[selectedTermId].classList.remove('selected');
      selectedTermId = null;
    }

    function placeTerm(termId, slotId) {
      if (answered || placements[slotId] || termEls[termId].classList.contains('placed')) return;
      placements[slotId] = termId;
      const term = question.terms.find((t) => t.id === termId);
      slotEls[slotId].textContent = term.label;
      slotEls[slotId].classList.add('filled');
      termEls[termId].classList.add('placed');
      clearSelection();
      if (Object.keys(placements).length === question.pairs.length) {
        checkMatchPairs(question, placements, slotEls, termEls);
      }
    }

    const defsWrap = h('div', { class: 'match-defs' });
    question.slots.forEach((slot) => {
      const dropEl = h('div', { class: 'match-drop-slot' }, 'גררו מונח לכאן');
      dropEl.addEventListener('click', () => {
        if (selectedTermId) placeTerm(selectedTermId, slot.id);
      });
      slotEls[slot.id] = dropEl;
      dropTargets.push({ el: dropEl, id: slot.id });
      defsWrap.appendChild(h('div', { class: 'match-def-row' }, [h('div', { class: 'match-def-text' }, slot.label), dropEl]));
    });

    const bank = h('div', { class: 'match-bank' });
    question.terms.forEach((term) => {
      const chip = h('div', { class: 'drag-tile' }, term.label);
      termEls[term.id] = chip;
      makeDraggable(chip, () => dropTargets, (slotId) => placeTerm(term.id, slotId));
      chip.addEventListener('click', () => {
        if (answered || chip.classList.contains('placed')) return;
        if (selectedTermId === term.id) {
          clearSelection();
          return;
        }
        clearSelection();
        selectedTermId = term.id;
        chip.classList.add('selected');
      });
      bank.appendChild(chip);
    });

    questionArea.appendChild(defsWrap);
    questionArea.appendChild(bank);
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

  function handleAnswer(userInput, elements) {
    if (answered) return;
    const correct = checkAnswer(currentQuestion, userInput);

    if (!correct && !retryUsed) {
      retryUsed = true;
      if (elements.type === 'drag') {
        elements.tileEl.classList.add('wrong', 'disabled');
        elements.slotEl.textContent = 'גררו את התשובה לכאן';
      } else {
        elements.input.value = '';
        elements.input.focus();
      }
      showHint();
      return;
    }

    answered = true;
    const result = applyAnswer(progress, topicConfig, themeConfig, currentQuestion, userInput);
    progress = result.progress;
    state.saveProgress(player.id, quest.id, progress);
    updateHud();

    if (elements.type === 'drag') {
      elements.slotEl.textContent = elements.chosenLabel;
      elements.slotEl.classList.add('filled', result.correct ? 'correct' : 'wrong');
      elements.tileEl.classList.add('placed');
      elements.tileRefs.forEach(({ el }) => el.classList.add('disabled'));
      if (!result.correct) {
        const correctTile = elements.tileRefs.find((t) => t.choice.value === currentQuestion.answer);
        if (correctTile) correctTile.el.classList.add('correct');
      }
    } else {
      elements.input.disabled = true;
      elements.submit.disabled = true;
    }

    appendFeedbackAndContinue(result);
  }

  function checkMatchPairs(question, placements, slotEls, termEls) {
    const allCorrect = question.pairs.every((pair) => placements[pair.id] === pair.id);

    if (!allCorrect && !retryUsed) {
      retryUsed = true;
      question.pairs.forEach((pair) => {
        if (placements[pair.id] !== pair.id) {
          const wrongTermId = placements[pair.id];
          delete placements[pair.id];
          slotEls[pair.id].textContent = 'גררו מונח לכאן';
          slotEls[pair.id].classList.remove('filled');
          termEls[wrongTermId].classList.remove('placed');
        }
      });
      showHint();
      return;
    }

    answered = true;
    const result = applyAnswer(progress, topicConfig, themeConfig, question, placements);
    progress = result.progress;
    state.saveProgress(player.id, quest.id, progress);
    updateHud();

    question.pairs.forEach((pair) => {
      const isRight = placements[pair.id] === pair.id;
      slotEls[pair.id].classList.add(isRight ? 'correct' : 'wrong');
      if (!isRight) {
        const correctTerm = question.terms.find((t) => t.id === pair.id);
        slotEls[pair.id].textContent = correctTerm.label;
      }
    });
    Object.values(termEls).forEach((el) => el.classList.add('disabled'));

    appendFeedbackAndContinue(result);
  }

  function appendFeedbackAndContinue(result) {
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

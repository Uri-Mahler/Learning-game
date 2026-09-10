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

    const renderers = {
      'multiple-choice': renderDragChoice,
      'fill-in': renderFillIn,
      'match-pairs': renderMatchPairs,
      'array-builder': renderArrayBuilder,
      'fair-share': renderFairShare,
      'fraction-build': renderFractionBuild,
      'fraction-equivalent': renderFractionEquivalent,
      'fraction-multiply': renderFractionMultiply,
    };
    renderers[currentQuestion.type](currentQuestion);

    feedbackArea = h('div', { class: 'feedback-area' });
    questionArea.appendChild(feedbackArea);
  }

  // Shared core for any question type that resolves via a single discrete
  // submission: peeks correctness without committing, gives one hint-only
  // retry on the first miss, and only scores/reveals on the final attempt.
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

  // ===== Multiple choice: drag tile into slot =====
  function renderDragChoice(question) {
    const slot = h('div', { class: 'drop-slot' }, 'גררו את התשובה לכאן');
    const tileRefs = [];
    const row = h('div', { class: 'drag-row' });

    question.choices.forEach((choice) => {
      const tile = h('div', { class: 'drag-tile' }, choice.label);
      tileRefs.push({ el: tile, choice });
      const place = () => {
        if (answered) return;
        attemptAnswer(choice.value, {
          onRetryVisual: () => {
            tile.classList.add('wrong', 'disabled');
            slot.textContent = 'גררו את התשובה לכאן';
          },
          onFinalVisual: (result) => {
            slot.textContent = choice.label;
            slot.classList.add('filled', result.correct ? 'correct' : 'wrong');
            tile.classList.add('placed');
            tileRefs.forEach((t) => t.el.classList.add('disabled'));
            if (!result.correct) {
              const correctTile = tileRefs.find((t) => t.choice.value === question.answer);
              if (correctTile) correctTile.el.classList.add('correct');
            }
          },
        });
      };
      makeDraggable(tile, () => [{ el: slot, id: 'slot' }], place);
      tile.addEventListener('click', place);
      row.appendChild(tile);
    });

    questionArea.appendChild(slot);
    questionArea.appendChild(row);
  }

  // ===== Fill-in numeric/text answer =====
  function renderFillIn(question) {
    const input = h('input', { class: 'text-input', type: 'text', inputmode: 'numeric', placeholder: '?' });
    const submit = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
    const submitAnswer = () => {
      attemptAnswer(input.value, {
        onRetryVisual: () => {
          input.value = '';
          input.focus();
        },
        onFinalVisual: () => {
          input.disabled = true;
          submit.disabled = true;
        },
      });
    };
    submit.addEventListener('click', submitAnswer);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitAnswer();
    });
    questionArea.appendChild(h('div', { class: 'fill-row' }, [input, submit]));
    setTimeout(() => input.focus(), 50);
  }

  // ===== Match pairs: drag terms onto matching definitions =====
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
        checkMatchPairs();
      }
    }

    function checkMatchPairs() {
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

  // ===== Array builder: drag sliders to size a rows x cols array =====
  function renderArrayBuilder(question) {
    let rows = 1;
    let cols = 1;
    const rowsLabel = h('span', {}, `שורות: ${rows}`);
    const colsLabel = h('span', {}, `טורים: ${cols}`);
    const grid = h('div', { class: 'array-grid' });
    const total = h('div', { class: 'array-total', dir: 'ltr' }, '');

    function redraw() {
      rowsLabel.textContent = `שורות: ${rows}`;
      colsLabel.textContent = `טורים: ${cols}`;
      grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      grid.innerHTML = '';
      for (let i = 0; i < rows * cols; i++) grid.appendChild(h('div', { class: 'array-cell' }));
      total.textContent = `${rows} × ${cols} = ${rows * cols}`;
    }

    const rowsSlider = h('input', { type: 'range', min: '1', max: String(question.maxSlider), value: '1', class: 'array-slider' });
    rowsSlider.addEventListener('input', () => {
      rows = Number(rowsSlider.value);
      redraw();
    });
    const colsSlider = h('input', { type: 'range', min: '1', max: String(question.maxSlider), value: '1', class: 'array-slider' });
    colsSlider.addEventListener('input', () => {
      cols = Number(colsSlider.value);
      redraw();
    });
    redraw();

    const checkBtn = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
    checkBtn.addEventListener('click', () => {
      attemptAnswer(
        { rows, cols },
        {
          onFinalVisual: (result) => {
            checkBtn.disabled = true;
            rowsSlider.disabled = true;
            colsSlider.disabled = true;
            if (!result.correct) {
              rows = question.targetRows;
              cols = question.targetCols;
              rowsSlider.value = String(rows);
              colsSlider.value = String(cols);
              redraw();
            }
          },
        }
      );
    });

    questionArea.appendChild(
      h('div', { class: 'array-builder' }, [
        h('div', { class: 'array-controls' }, [
          h('label', {}, [rowsLabel, rowsSlider]),
          h('label', {}, [colsLabel, colsSlider]),
        ]),
        grid,
        total,
        checkBtn,
      ])
    );
  }

  // ===== Fair share: drag tokens equally into buckets =====
  function renderFairShare(question) {
    const bucketCounts = new Array(question.divisor).fill(0);
    const bucketEls = [];
    const dropTargets = [];
    const bucketsRow = h('div', { class: 'fairshare-buckets' });
    for (let i = 0; i < question.divisor; i++) {
      const bucketEl = h('div', { class: 'fairshare-bucket' });
      bucketEls.push(bucketEl);
      dropTargets.push({ el: bucketEl, id: i });
      bucketsRow.appendChild(bucketEl);
    }

    const bank = h('div', { class: 'fairshare-bank' });
    const tokens = [];

    function placeToken(rec, bucketIndex) {
      if (answered) return;
      if (rec.bucketIndex !== null) bucketCounts[rec.bucketIndex]--;
      rec.bucketIndex = bucketIndex;
      bucketCounts[bucketIndex]++;
      bucketEls[bucketIndex].appendChild(rec.el);
      if (tokens.every((t) => t.bucketIndex !== null)) checkFairShare();
    }

    for (let i = 0; i < question.dividend; i++) {
      const token = h('div', { class: 'fairshare-token' }, '🔵');
      const rec = { el: token, bucketIndex: null };
      tokens.push(rec);
      makeDraggable(token, () => dropTargets, (bucketIndex) => placeToken(rec, bucketIndex));
      token.addEventListener('click', () => {
        if (answered) return;
        const target = bucketCounts.indexOf(Math.min(...bucketCounts));
        placeToken(rec, target);
      });
      bank.appendChild(token);
    }

    function checkFairShare() {
      const allEqual = bucketCounts.every((c) => c === question.answer);

      if (!allEqual && !retryUsed) {
        retryUsed = true;
        tokens.forEach((t) => {
          t.bucketIndex = null;
          bank.appendChild(t.el);
        });
        bucketCounts.fill(0);
        showHint();
        return;
      }

      answered = true;
      const result = applyAnswer(progress, topicConfig, themeConfig, question, bucketCounts.slice());
      progress = result.progress;
      state.saveProgress(player.id, quest.id, progress);
      updateHud();
      bucketEls.forEach((el, i) => el.classList.add(bucketCounts[i] === question.answer ? 'correct' : 'wrong'));
      appendFeedbackAndContinue(result);
    }

    questionArea.appendChild(bucketsRow);
    questionArea.appendChild(bank);
  }

  // ===== Fraction build: tap slices to shade a fraction of a shape =====
  function renderFractionBuild(question) {
    let shadedCount = 0;
    const slices = [];
    const shape = h('div', { class: 'fraction-shape' });
    const label = h('div', { class: 'fraction-label', dir: 'ltr' }, `צבעתם 0/${question.denominator}`);

    for (let i = 0; i < question.denominator; i++) {
      const slice = h('div', { class: 'fraction-slice' });
      slice.addEventListener('click', () => {
        if (answered) return;
        slice.classList.toggle('shaded');
        shadedCount = shape.querySelectorAll('.shaded').length;
        label.textContent = `צבעתם ${shadedCount}/${question.denominator}`;
      });
      slices.push(slice);
      shape.appendChild(slice);
    }

    const checkBtn = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
    checkBtn.addEventListener('click', () => {
      attemptAnswer(shadedCount, {
        onFinalVisual: (result) => {
          checkBtn.disabled = true;
          slices.forEach((s) => s.classList.add('locked'));
          if (!result.correct) {
            slices.forEach((s) => s.classList.remove('shaded'));
            for (let i = 0; i < question.answer; i++) slices[i].classList.add('shaded');
            label.textContent = `צבעתם ${question.answer}/${question.denominator}`;
          }
        },
      });
    });

    questionArea.appendChild(h('div', { class: 'fraction-row' }, [shape, label, checkBtn]));
  }

  // ===== Fraction equivalent: match shaded area across two shapes =====
  function renderFractionEquivalent(question) {
    const shape1 = h('div', { class: 'fraction-shape' });
    for (let i = 0; i < question.baseDenominator; i++) {
      shape1.appendChild(h('div', { class: `fraction-slice locked${i < question.baseNumerator ? ' shaded' : ''}` }));
    }
    const label1 = h('div', { class: 'fraction-label', dir: 'ltr' }, `${question.baseNumerator}/${question.baseDenominator}`);

    let shadedCount = 0;
    const slices2 = [];
    const shape2 = h('div', { class: 'fraction-shape' });
    const label2 = h('div', { class: 'fraction-label', dir: 'ltr' }, `צבעתם 0/${question.targetDenominator}`);

    for (let i = 0; i < question.targetDenominator; i++) {
      const slice = h('div', { class: 'fraction-slice' });
      slice.addEventListener('click', () => {
        if (answered) return;
        slice.classList.toggle('shaded');
        shadedCount = shape2.querySelectorAll('.shaded').length;
        label2.textContent = `צבעתם ${shadedCount}/${question.targetDenominator}`;
      });
      slices2.push(slice);
      shape2.appendChild(slice);
    }

    const checkBtn = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
    checkBtn.addEventListener('click', () => {
      attemptAnswer(shadedCount, {
        onFinalVisual: (result) => {
          checkBtn.disabled = true;
          slices2.forEach((s) => s.classList.add('locked'));
          if (!result.correct) {
            slices2.forEach((s) => s.classList.remove('shaded'));
            for (let i = 0; i < question.answer; i++) slices2[i].classList.add('shaded');
            label2.textContent = `צבעתם ${question.answer}/${question.targetDenominator}`;
          }
        },
      });
    });

    questionArea.appendChild(
      h('div', { class: 'fraction-pair' }, [
        h('div', { class: 'fraction-row' }, [shape1, label1]),
        h('div', { class: 'fraction-row' }, [shape2, label2]),
        checkBtn,
      ])
    );
  }

  // ===== Fraction multiply: shade rows (given) x columns (tap) = overlap =====
  function renderFractionMultiply(question) {
    const cellEls = [];
    const colShaded = new Array(question.cols).fill(false);
    let answerCount = 0;

    const grid = h('div', { class: 'fracmul-grid' });
    grid.style.gridTemplateColumns = `repeat(${question.cols}, 1fr)`;
    for (let r = 0; r < question.rows; r++) {
      cellEls[r] = [];
      for (let c = 0; c < question.cols; c++) {
        const cell = h('div', { class: `fracmul-cell${r < question.shadedRows ? ' row-shaded' : ''}` });
        cellEls[r][c] = cell;
        cell.addEventListener('click', () => {
          if (answered) return;
          toggleColumn(c);
        });
        grid.appendChild(cell);
      }
    }

    const label = h('div', { class: 'fraction-label', dir: 'ltr' }, `החלק המשותף: 0/${question.rows * question.cols}`);

    function toggleColumn(c) {
      colShaded[c] = !colShaded[c];
      for (let r = 0; r < question.rows; r++) {
        cellEls[r][c].classList.toggle('col-shaded', colShaded[c]);
        cellEls[r][c].classList.toggle('overlap', colShaded[c] && r < question.shadedRows);
      }
      answerCount = countOverlap();
      label.textContent = `החלק המשותף: ${answerCount}/${question.rows * question.cols}`;
    }

    function countOverlap() {
      let n = 0;
      for (let r = 0; r < question.shadedRows; r++) {
        for (let c = 0; c < question.cols; c++) {
          if (colShaded[c]) n++;
        }
      }
      return n;
    }

    const checkBtn = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
    checkBtn.addEventListener('click', () => {
      attemptAnswer(answerCount, {
        onFinalVisual: (result) => {
          checkBtn.disabled = true;
          if (!result.correct) {
            for (let c = 0; c < question.cols; c++) colShaded[c] = false;
            for (let r = 0; r < question.rows; r++) {
              for (let c = 0; c < question.cols; c++) cellEls[r][c].classList.remove('col-shaded', 'overlap');
            }
            for (let c = 0; c < question.answerCols; c++) toggleColumn(c);
          }
        },
      });
    });

    questionArea.appendChild(h('div', { class: 'fracmul-grid-wrap' }, [grid, label, checkBtn]));
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

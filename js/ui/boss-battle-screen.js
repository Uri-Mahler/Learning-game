import { h, mount, applyThemeColors } from './components.js';
import * as state from '../state.js';
import { loadQuestBundle } from '../config-loader.js';
import { getNextQuestion, checkAnswer, applyBonusPoints } from '../game-engine.js';

// Boss battle is a separate, faster mode from regular practice: rapid
// tap-to-answer rounds against a themed rival, with a health bar instead
// of the usual points/level HUD. No drag, no retry-hint softness — a
// wrong answer costs a shield immediately, matching an arcade feel.
const BOSS_HITS_TO_WIN = 6;
const PLAYER_SHIELDS = 3;
const VICTORY_BONUS_POINTS = 150;
const ALLOWED_TYPES = new Set(['multiple-choice', 'fill-in']);

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function renderBossBattleScreen(root, { player, quest, onExit }) {
  const screen = h('div', { class: 'screen' }, [h('div', { class: 'empty-state' }, 'טוען קרב...')]);
  mount(root, screen);

  const { topicConfig, themeConfig, provider } = await loadQuestBundle(quest);
  applyThemeColors(themeConfig);
  const boss = themeConfig.boss;

  const baseProgress = state.getProgress(player.id, quest.id);
  let bossHp = BOSS_HITS_TO_WIN;
  let shields = PLAYER_SHIELDS;
  let currentQuestion = null;
  let answered = false;

  const topBar = h('div', { class: 'top-bar' }, [
    h('div', { class: 'top-bar__player' }, [
      h('span', { class: 'top-bar__avatar' }, player.avatarEmoji),
      h('span', {}, player.name),
    ]),
    h('button', { class: 'icon-btn', type: 'button', title: 'בריחה מהקרב', onclick: onExit }, '🏳️'),
  ]);

  const bossHud = h('div', { class: 'boss-hud' });
  const questionArea = h('div', { class: 'question-card' });
  const layout = h('div', { class: 'screen' }, [
    topBar,
    h('h1', { class: 'title' }, `קרב בוס: ${boss.name}`),
    h('p', { class: 'subtitle' }, boss.tagline),
    bossHud,
    questionArea,
  ]);
  mount(root, layout);

  function renderBossHud() {
    bossHud.innerHTML = '';
    bossHud.appendChild(h('div', { class: 'boss-portrait' }, boss.emoji));
    bossHud.appendChild(
      h('div', { class: 'boss-info' }, [
        h('div', { class: 'boss-name' }, boss.name),
        h('div', { class: 'boss-hp-track' }, [
          h('div', { class: 'boss-hp-fill', style: `width:${Math.max(0, (bossHp / BOSS_HITS_TO_WIN) * 100)}%` }),
        ]),
      ])
    );
    bossHud.appendChild(
      h(
        'div',
        { class: 'player-shields' },
        Array.from({ length: PLAYER_SHIELDS }, (_, i) => (i < shields ? '🛡️' : '💔')).join('')
      )
    );
  }

  function revealAnswer(question) {
    return question.acceptedAnswers ? question.acceptedAnswers[0] : question.answer;
  }

  function nextQuestion() {
    answered = false;
    let q;
    for (let attempts = 0; attempts < 10; attempts++) {
      q = getNextQuestion(provider, { ...baseProgress, recentQuestionIds: [] }, topicConfig);
      if (ALLOWED_TYPES.has(q.type)) break;
    }
    currentQuestion = q;
    questionArea.innerHTML = '';
    questionArea.appendChild(h('div', { class: 'question-card__prompt', dir: q.dir || null }, q.prompt));
    if (q.type === 'multiple-choice') renderChoices(q);
    else renderFillIn(q);
  }

  function renderChoices(q) {
    const row = h('div', { class: 'boss-choice-row' });
    q.choices.forEach((choice) => {
      const btn = h(
        'button',
        { class: 'btn boss-choice-btn', type: 'button', onclick: () => resolve(choice.value === q.answer) },
        choice.label
      );
      row.appendChild(btn);
    });
    questionArea.appendChild(row);
  }

  function renderFillIn(q) {
    const input = h('input', { class: 'text-input', type: 'text', inputmode: 'numeric', placeholder: '?' });
    const submit = h(
      'button',
      { class: 'btn btn--accent', type: 'button', onclick: () => resolve(checkAnswer(q, input.value)) },
      'בדוק'
    );
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') resolve(checkAnswer(q, input.value));
    });
    questionArea.appendChild(h('div', { class: 'fill-row' }, [input, submit]));
    setTimeout(() => input.focus(), 50);
  }

  function resolve(correct) {
    if (answered) return;
    answered = true;

    if (correct) bossHp -= 1;
    else shields -= 1;
    renderBossHud();

    if (bossHp <= 0) {
      victory();
      return;
    }
    if (shields <= 0) {
      defeat();
      return;
    }

    const feedback = h('div', { class: `feedback feedback--${correct ? 'correct' : 'wrong'}` }, [
      correct ? pick(boss.hitMessages) : pick(boss.missMessages),
      !correct ? h('span', { class: 'reveal-answer' }, `התשובה הנכונה: ${revealAnswer(currentQuestion)}`) : null,
    ]);
    const continueBtn = h('button', { class: 'btn btn--full', type: 'button', onclick: nextQuestion }, 'להמשיך בקרב');
    questionArea.appendChild(feedback);
    questionArea.appendChild(continueBtn);
  }

  function victory() {
    const before = state.getProgress(player.id, quest.id);
    const { progress: after, leveledUp } = applyBonusPoints(before, topicConfig, themeConfig, VICTORY_BONUS_POINTS);
    state.saveProgress(player.id, quest.id, after);
    showEndOverlay({
      emoji: '🏆',
      title: `ניצחתם את ${boss.name}!`,
      sub: `זכיתם ב-${VICTORY_BONUS_POINTS} נקודות בונוס!${leveledUp ? ' ועליתם דרגה! 🎉' : ''}`,
    });
  }

  function defeat() {
    showEndOverlay({
      emoji: '💫',
      title: `${boss.name} ניצח הפעם...`,
      sub: 'אבל בפעם הבאה תביסו אותו! אפשר לנסות שוב מתי שרוצים.',
    });
  }

  function showEndOverlay({ emoji, title, sub }) {
    const overlay = h('div', { class: 'overlay' }, [
      h('div', { class: 'overlay__card' }, [
        h('div', { class: 'overlay__emoji' }, emoji),
        h('div', { class: 'overlay__level-name' }, title),
        h('div', {}, sub),
        h(
          'button',
          {
            class: 'btn btn--accent btn--full',
            type: 'button',
            onclick: () => {
              overlay.remove();
              onExit();
            },
          },
          'חזרה'
        ),
      ]),
    ]);
    document.body.appendChild(overlay);
  }

  renderBossHud();
  nextQuestion();
}

import { h, mount, applyThemeColors } from './components.js';
import { loadTopicConfig, loadThemeConfig } from '../config-loader.js';
import * as state from '../state.js';

export async function renderSubtopicSelectScreen(root, { player, quest, onSubtopicChosen, onBossBattle, onBack }) {
  const screen = h('div', { class: 'screen' }, [h('div', { class: 'empty-state' }, 'טוען...')]);
  mount(root, screen);

  const [topicConfig, themeConfig] = await Promise.all([
    loadTopicConfig(quest.topicId),
    loadThemeConfig(quest.themeId),
  ]);
  applyThemeColors(themeConfig);

  const mixedCard = h(
    'div',
    { class: 'card card--selectable', onclick: () => onSubtopicChosen(null) },
    [
      h('div', { class: 'card__emoji' }, '🎲'),
      h('div', { class: 'card__title' }, 'תרגול מעורב'),
      h('div', { class: 'card__meta' }, 'קצת מהכול'),
    ]
  );

  const bossCard = themeConfig.boss
    ? h(
        'div',
        { class: 'card card--selectable card--boss', onclick: onBossBattle },
        [
          h('div', { class: 'card__emoji' }, themeConfig.boss.emoji),
          h('div', { class: 'card__title' }, `קרב בוס: ${themeConfig.boss.name}`),
          h('div', { class: 'card__meta' }, themeConfig.boss.tagline),
        ]
      )
    : null;

  const subtopicCards = (topicConfig.subtopics || []).map((s) => {
    const prog = state.getSubtopicProgress(player.id, quest.id, s.id);
    const done = prog.questionsAnswered >= state.SUBTOPIC_QUESTION_CAP;
    const pct = Math.round((prog.questionsAnswered / state.SUBTOPIC_QUESTION_CAP) * 100);
    return h(
      'div',
      { class: 'card card--selectable', onclick: () => onSubtopicChosen(s.id) },
      [
        h('div', { class: 'card__emoji' }, s.icon || '📚'),
        h('div', { class: 'card__title' }, s.name),
        h(
          'div',
          { class: 'card__meta' },
          done ? '✅ הושלם!' : `${prog.questionsAnswered}/${state.SUBTOPIC_QUESTION_CAP}`
        ),
        h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: `width:${pct}%` })]),
      ]
    );
  });

  const layout = h('div', { class: 'screen' }, [
    h('div', { class: 'top-bar' }, [
      h('div', { class: 'top-bar__player' }, [
        h('span', { class: 'top-bar__avatar' }, player.avatarEmoji),
        h('span', {}, player.name),
      ]),
      h('button', { class: 'icon-btn', type: 'button', title: 'חזרה למשימות', onclick: onBack }, '↩️'),
    ]),
    h('h1', { class: 'title' }, 'מה נתרגל היום?'),
    h('p', { class: 'subtitle' }, quest.name),
    h('div', { class: 'grid' }, [mixedCard, bossCard, ...subtopicCards]),
  ]);
  mount(root, layout);
}

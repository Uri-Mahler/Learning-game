import { h, mount, clearTheme } from './components.js';
import * as state from '../state.js';
import { loadQuests, loadTopicConfig, loadThemeConfig } from '../config-loader.js';
import { displayLevelIndex } from '../game-engine.js';

export async function renderQuestMenuScreen(root, { player, onQuestChosen, onSwitchPlayer }) {
  clearTheme();

  const screen = h('div', { class: 'screen' }, [
    h('div', { class: 'top-bar' }, [
      h('div', { class: 'top-bar__player' }, [
        h('span', { class: 'top-bar__avatar' }, player.avatarEmoji),
        h('span', {}, player.name),
      ]),
      h('button', { class: 'icon-btn', type: 'button', title: 'החלף שחקן', onclick: onSwitchPlayer }, '🔄'),
    ]),
    h('h1', { class: 'title' }, 'בחרו משימה'),
    h('div', { class: 'empty-state' }, 'טוען משימות...'),
  ]);
  mount(root, screen);

  const quests = await loadQuests();
  const cards = await Promise.all(
    quests.map((quest) => buildQuestCard(quest, player, onQuestChosen))
  );

  const grid = h('div', { class: 'grid' }, cards);
  const loadingNode = screen.querySelector('.empty-state');
  screen.replaceChild(grid, loadingNode);
}

async function buildQuestCard(quest, player, onChoose) {
  const [topicConfig, themeConfig] = await Promise.all([
    loadTopicConfig(quest.topicId),
    loadThemeConfig(quest.themeId),
  ]);
  const progress = state.getProgress(player.id, quest.id);
  const played = progress.questionsAnswered > 0;
  const levelIdx = displayLevelIndex(progress, topicConfig, themeConfig);
  const levelName = themeConfig.levelNames[levelIdx];

  return h(
    'div',
    { class: 'card card--selectable', onclick: () => onChoose(quest) },
    [
      h('div', { class: 'card__emoji' }, themeConfig.mascotEmoji),
      h('div', { class: 'card__title' }, quest.name),
      h('div', { class: 'card__meta' }, `${themeConfig.name} · ${topicConfig.name}`),
      h(
        'div',
        { class: 'card__meta' },
        played
          ? `${levelName} · ${progress.points} ${themeConfig.vocabulary.pointsShort}`
          : themeConfig.vocabulary.start
      ),
    ]
  );
}

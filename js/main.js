import * as state from './state.js';
import { renderPlayerSelectScreen } from './ui/player-select-screen.js';
import { renderQuestMenuScreen } from './ui/quest-menu-screen.js';
import { renderSubtopicSelectScreen } from './ui/subtopic-select-screen.js';
import { renderGameScreen } from './ui/game-screen.js';

const root = document.getElementById('app');

function showPlayerSelect() {
  renderPlayerSelectScreen(root, {
    onPlayerChosen: (playerId) => {
      state.setActivePlayerId(playerId);
      showQuestMenu();
    },
  });
}

function showQuestMenu() {
  const player = state.getActivePlayer();
  if (!player) {
    showPlayerSelect();
    return;
  }
  renderQuestMenuScreen(root, {
    player,
    onQuestChosen: (quest) => showSubtopicSelect(player, quest),
    onSwitchPlayer: () => {
      state.clearActivePlayer();
      showPlayerSelect();
    },
  });
}

function showSubtopicSelect(player, quest) {
  renderSubtopicSelectScreen(root, {
    player,
    quest,
    onSubtopicChosen: (subtopicId) => showGame(player, quest, subtopicId),
    onBack: showQuestMenu,
  });
}

function showGame(player, quest, subtopicId) {
  renderGameScreen(root, { player, quest, subtopicId, onExit: () => showSubtopicSelect(player, quest) });
}

const activePlayer = state.getActivePlayer();
if (activePlayer) showQuestMenu();
else showPlayerSelect();

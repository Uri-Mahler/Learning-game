import * as state from './state.js';
import { renderPlayerSelectScreen } from './ui/player-select-screen.js';
import { renderQuestMenuScreen } from './ui/quest-menu-screen.js';
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
    onQuestChosen: (quest) => showGame(player, quest),
    onSwitchPlayer: () => {
      state.clearActivePlayer();
      showPlayerSelect();
    },
  });
}

function showGame(player, quest) {
  renderGameScreen(root, { player, quest, onExit: showQuestMenu });
}

const activePlayer = state.getActivePlayer();
if (activePlayer) showQuestMenu();
else showPlayerSelect();

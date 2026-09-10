// All browser-local persistence (no backend). Everything lives in localStorage.

const PLAYERS_KEY = 'ltg:players';
const ACTIVE_PLAYER_KEY = 'ltg:activePlayer';
const RECENT_HISTORY_LENGTH = 6;

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPlayers() {
  return readJSON(PLAYERS_KEY, []);
}

export function createPlayer(name, avatarEmoji) {
  const players = getPlayers();
  const player = { id: makeId(), name, avatarEmoji, createdAt: Date.now() };
  players.push(player);
  writeJSON(PLAYERS_KEY, players);
  return player;
}

export function deletePlayer(playerId) {
  const players = getPlayers().filter((p) => p.id !== playerId);
  writeJSON(PLAYERS_KEY, players);
}

export function getActivePlayerId() {
  return localStorage.getItem(ACTIVE_PLAYER_KEY);
}

export function setActivePlayerId(playerId) {
  localStorage.setItem(ACTIVE_PLAYER_KEY, playerId);
}

export function clearActivePlayer() {
  localStorage.removeItem(ACTIVE_PLAYER_KEY);
}

export function getActivePlayer() {
  const id = getActivePlayerId();
  if (!id) return null;
  return getPlayers().find((p) => p.id === id) || null;
}

function progressKey(playerId, questId) {
  return `ltg:progress:${playerId}:${questId}`;
}

export function defaultProgress() {
  return {
    points: 0,
    level: 0,
    streak: 0,
    bestStreak: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    lastPlayedAt: null,
    recentQuestionIds: [],
  };
}

export function getProgress(playerId, questId) {
  return readJSON(progressKey(playerId, questId), defaultProgress());
}

export function saveProgress(playerId, questId, progress) {
  writeJSON(progressKey(playerId, questId), progress);
}

export function pushRecentQuestionId(progress, id) {
  const list = [id, ...progress.recentQuestionIds].slice(0, RECENT_HISTORY_LENGTH);
  return { ...progress, recentQuestionIds: list };
}

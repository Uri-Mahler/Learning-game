import { h, mount, clearTheme, AVATAR_OPTIONS } from './components.js';
import * as state from '../state.js';

export function renderPlayerSelectScreen(root, { onPlayerChosen }) {
  clearTheme();
  const players = state.getPlayers();

  const cards = players.map((player) =>
    h(
      'div',
      { class: 'card card--selectable', onclick: () => onPlayerChosen(player.id) },
      [
        h('div', { class: 'card__emoji' }, player.avatarEmoji),
        h('div', { class: 'card__title' }, player.name),
      ]
    )
  );

  const screen = h('div', { class: 'screen' }, [
    h('h1', { class: 'title' }, 'מי משחק היום?'),
    h('p', { class: 'subtitle' }, 'בחרו שחקן קיים, או הוסיפו שחקן חדש'),
    players.length ? h('div', { class: 'grid' }, cards) : null,
    newPlayerCard((player) => onPlayerChosen(player.id)),
  ]);

  mount(root, screen);
}

function newPlayerCard(onCreated) {
  let selectedAvatar = AVATAR_OPTIONS[0];
  const avatarButtons = [];

  const avatarPicker = h('div', { class: 'avatar-picker' });
  AVATAR_OPTIONS.forEach((emoji) => {
    const btn = h(
      'button',
      {
        class: `avatar-option${emoji === selectedAvatar ? ' selected' : ''}`,
        type: 'button',
        onclick: () => {
          selectedAvatar = emoji;
          avatarButtons.forEach((b) => b.el.classList.toggle('selected', b.emoji === emoji));
        },
      },
      emoji
    );
    avatarButtons.push({ el: btn, emoji });
    avatarPicker.appendChild(btn);
  });

  const nameInput = h('input', {
    class: 'text-input',
    type: 'text',
    placeholder: 'איך קוראים לך?',
    maxlength: '20',
  });

  const createPlayer = () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.focus();
      return;
    }
    const player = state.createPlayer(name, selectedAvatar);
    onCreated(player);
  };

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createPlayer();
  });

  return h('div', { class: 'card' }, [
    h('div', { class: 'card__title' }, '+ שחקן חדש'),
    nameInput,
    avatarPicker,
    h('button', { class: 'btn btn--accent btn--full', type: 'button', onclick: createPlayer }, 'צור שחקן'),
  ]);
}

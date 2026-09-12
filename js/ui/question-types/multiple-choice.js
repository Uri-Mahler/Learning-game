// Multiple choice: drag a tile into the slot (tap also works as a fallback).
import { h, makeDraggable } from '../components.js';

export function render(container, question, { attemptAnswer }) {
  const slot = h('div', { class: 'drop-slot' }, 'גררו את התשובה לכאן');
  const tileRefs = [];
  const row = h('div', { class: 'drag-row' });

  question.choices.forEach((choice) => {
    const tile = h('div', { class: 'drag-tile' }, choice.label);
    tileRefs.push({ el: tile, choice });
    const place = () => {
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

  container.appendChild(slot);
  container.appendChild(row);
}

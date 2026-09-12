// Match pairs: drag terms onto matching definitions.
// Term chips are actually moved (not hidden+duplicated) so a placed chip
// stays the same draggable/tappable element and can be relocated to a
// different slot, or back to the bank, any time before all pairs are set.
import { h, makeDraggable } from '../components.js';

export function render(container, question, { attemptAnswer, isAnswered }) {
  const placements = {}; // slotId -> termId
  const slotEls = {};
  const termEls = {};
  const dropTargets = [];
  let selectedTermId = null;

  function clearSelection() {
    if (selectedTermId && termEls[selectedTermId]) termEls[selectedTermId].classList.remove('selected');
    selectedTermId = null;
  }

  function currentSlotOf(termId) {
    return Object.keys(placements).find((sid) => placements[sid] === termId) || null;
  }

  function moveTerm(termId, destination) {
    if (isAnswered()) return;
    const chip = termEls[termId];
    const prevSlot = currentSlotOf(termId);
    if (prevSlot) {
      delete placements[prevSlot];
      slotEls[prevSlot].classList.remove('filled');
      slotEls[prevSlot].textContent = 'גררו מונח לכאן';
    }

    if (destination === 'bank') {
      bank.appendChild(chip);
    } else {
      const occupantId = placements[destination];
      if (occupantId && occupantId !== termId) {
        delete placements[destination];
        bank.appendChild(termEls[occupantId]);
      }
      placements[destination] = termId;
      slotEls[destination].classList.add('filled');
      slotEls[destination].textContent = '';
      slotEls[destination].appendChild(chip);
    }

    clearSelection();
    if (Object.keys(placements).length === question.pairs.length) {
      checkAll();
    }
  }

  function checkAll() {
    attemptAnswer(placements, {
      onRetryVisual: () => {
        question.pairs.forEach((pair) => {
          if (placements[pair.id] !== pair.id) moveTerm(placements[pair.id], 'bank');
        });
      },
      onFinalVisual: () => {
        question.pairs.forEach((pair) => {
          const isRight = placements[pair.id] === pair.id;
          slotEls[pair.id].classList.add(isRight ? 'correct' : 'wrong');
          if (!isRight) {
            const correctTerm = question.terms.find((t) => t.id === pair.id);
            slotEls[pair.id].textContent = correctTerm.label;
          }
        });
        Object.values(termEls).forEach((el) => el.classList.add('disabled'));
      },
    });
  }

  const defsWrap = h('div', { class: 'match-defs' });
  question.slots.forEach((slot) => {
    const dropEl = h('div', { class: 'match-drop-slot' }, 'גררו מונח לכאן');
    dropEl.addEventListener('click', () => {
      if (isAnswered()) return;
      if (selectedTermId) {
        moveTerm(selectedTermId, slot.id);
      } else if (placements[slot.id]) {
        moveTerm(placements[slot.id], 'bank');
      }
    });
    slotEls[slot.id] = dropEl;
    dropTargets.push({ el: dropEl, id: slot.id });
    defsWrap.appendChild(h('div', { class: 'match-def-row' }, [h('div', { class: 'match-def-text' }, slot.label), dropEl]));
  });

  const bank = h('div', { class: 'match-bank' });
  question.terms.forEach((term) => {
    const chip = h('div', { class: 'drag-tile' }, term.label);
    termEls[term.id] = chip;
    makeDraggable(chip, () => [...dropTargets, { el: bank, id: 'bank' }], (dest) => moveTerm(term.id, dest));
    chip.addEventListener('click', () => {
      if (isAnswered()) return;
      if (currentSlotOf(term.id)) {
        // tapping a chip that's already placed takes the answer back
        moveTerm(term.id, 'bank');
        return;
      }
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

  container.appendChild(defsWrap);
  container.appendChild(bank);
}

// Fraction build: tap slices to shade a given fraction of a shape.
import { h } from '../components.js';

export function render(container, question, { attemptAnswer, isAnswered }) {
  let shadedCount = 0;
  const slices = [];
  const shape = h('div', { class: 'fraction-shape' });
  const label = h('div', { class: 'fraction-label', dir: 'ltr' }, `צבעתם 0/${question.denominator}`);

  for (let i = 0; i < question.denominator; i++) {
    const slice = h('div', { class: 'fraction-slice' });
    slice.addEventListener('click', () => {
      if (isAnswered()) return;
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

  container.appendChild(h('div', { class: 'fraction-row' }, [shape, label, checkBtn]));
}

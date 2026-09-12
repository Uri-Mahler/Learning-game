// Fraction equivalent: shade a second, differently-divided shape to match
// the same area as a given fraction.
import { h } from '../components.js';

export function render(container, question, { attemptAnswer, isAnswered }) {
  const shape1 = h('div', { class: 'fraction-shape' });
  for (let i = 0; i < question.baseDenominator; i++) {
    shape1.appendChild(h('div', { class: `fraction-slice locked${i < question.baseNumerator ? ' shaded' : ''}` }));
  }
  const label1 = h('div', { class: 'fraction-label', dir: 'ltr' }, `${question.baseNumerator}/${question.baseDenominator}`);

  let shadedCount = 0;
  const slices2 = [];
  const shape2 = h('div', { class: 'fraction-shape' });
  const label2 = h('div', { class: 'fraction-label', dir: 'ltr' }, `צבעתם 0/${question.targetDenominator}`);

  for (let i = 0; i < question.targetDenominator; i++) {
    const slice = h('div', { class: 'fraction-slice' });
    slice.addEventListener('click', () => {
      if (isAnswered()) return;
      slice.classList.toggle('shaded');
      shadedCount = shape2.querySelectorAll('.shaded').length;
      label2.textContent = `צבעתם ${shadedCount}/${question.targetDenominator}`;
    });
    slices2.push(slice);
    shape2.appendChild(slice);
  }

  const checkBtn = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
  checkBtn.addEventListener('click', () => {
    attemptAnswer(shadedCount, {
      onFinalVisual: (result) => {
        checkBtn.disabled = true;
        slices2.forEach((s) => s.classList.add('locked'));
        if (!result.correct) {
          slices2.forEach((s) => s.classList.remove('shaded'));
          for (let i = 0; i < question.answer; i++) slices2[i].classList.add('shaded');
          label2.textContent = `צבעתם ${question.answer}/${question.targetDenominator}`;
        }
      },
    });
  });

  container.appendChild(
    h('div', { class: 'fraction-pair' }, [
      h('div', { class: 'fraction-row' }, [shape1, label1]),
      h('div', { class: 'fraction-row' }, [shape2, label2]),
      checkBtn,
    ])
  );
}

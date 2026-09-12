// Fraction multiply: one fraction is given as shaded rows; tap columns to
// shade the other fraction. The overlap is the product - "part of a part."
import { h } from '../components.js';

export function render(container, question, { attemptAnswer, isAnswered }) {
  const cellEls = [];
  const colShaded = new Array(question.cols).fill(false);
  let answerCount = 0;

  const grid = h('div', { class: 'fracmul-grid' });
  grid.style.gridTemplateColumns = `repeat(${question.cols}, 1fr)`;
  for (let r = 0; r < question.rows; r++) {
    cellEls[r] = [];
    for (let c = 0; c < question.cols; c++) {
      const cell = h('div', { class: `fracmul-cell${r < question.shadedRows ? ' row-shaded' : ''}` });
      cellEls[r][c] = cell;
      cell.addEventListener('click', () => {
        if (isAnswered()) return;
        toggleColumn(c);
      });
      grid.appendChild(cell);
    }
  }

  const label = h('div', { class: 'fraction-label', dir: 'ltr' }, `החלק המשותף: 0/${question.rows * question.cols}`);

  function toggleColumn(c) {
    colShaded[c] = !colShaded[c];
    for (let r = 0; r < question.rows; r++) {
      cellEls[r][c].classList.toggle('col-shaded', colShaded[c]);
      cellEls[r][c].classList.toggle('overlap', colShaded[c] && r < question.shadedRows);
    }
    answerCount = countOverlap();
    label.textContent = `החלק המשותף: ${answerCount}/${question.rows * question.cols}`;
  }

  function countOverlap() {
    let n = 0;
    for (let r = 0; r < question.shadedRows; r++) {
      for (let c = 0; c < question.cols; c++) {
        if (colShaded[c]) n++;
      }
    }
    return n;
  }

  const checkBtn = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
  checkBtn.addEventListener('click', () => {
    attemptAnswer(answerCount, {
      onFinalVisual: (result) => {
        checkBtn.disabled = true;
        if (!result.correct) {
          for (let c = 0; c < question.cols; c++) colShaded[c] = false;
          for (let r = 0; r < question.rows; r++) {
            for (let c = 0; c < question.cols; c++) cellEls[r][c].classList.remove('col-shaded', 'overlap');
          }
          for (let c = 0; c < question.answerCols; c++) toggleColumn(c);
        }
      },
    });
  });

  container.appendChild(h('div', { class: 'fracmul-grid-wrap' }, [grid, label, checkBtn]));
}

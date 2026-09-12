// Array builder: drag two sliders to size a rows x columns grid until it
// matches the target multiplication fact (multiplication as area).
import { h } from '../components.js';

export function render(container, question, { attemptAnswer }) {
  let rows = 1;
  let cols = 1;
  const rowsLabel = h('span', {}, `שורות: ${rows}`);
  const colsLabel = h('span', {}, `טורים: ${cols}`);
  const grid = h('div', { class: 'array-grid' });
  const total = h('div', { class: 'array-total', dir: 'ltr' }, '');

  function redraw() {
    rowsLabel.textContent = `שורות: ${rows}`;
    colsLabel.textContent = `טורים: ${cols}`;
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.innerHTML = '';
    for (let i = 0; i < rows * cols; i++) grid.appendChild(h('div', { class: 'array-cell' }));
    total.textContent = `${rows} × ${cols} = ${rows * cols}`;
  }

  const rowsSlider = h('input', { type: 'range', min: '1', max: String(question.maxSlider), value: '1', class: 'array-slider' });
  rowsSlider.addEventListener('input', () => {
    rows = Number(rowsSlider.value);
    redraw();
  });
  const colsSlider = h('input', { type: 'range', min: '1', max: String(question.maxSlider), value: '1', class: 'array-slider' });
  colsSlider.addEventListener('input', () => {
    cols = Number(colsSlider.value);
    redraw();
  });
  redraw();

  const checkBtn = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
  checkBtn.addEventListener('click', () => {
    attemptAnswer(
      { rows, cols },
      {
        onFinalVisual: (result) => {
          checkBtn.disabled = true;
          rowsSlider.disabled = true;
          colsSlider.disabled = true;
          if (!result.correct) {
            rows = question.targetRows;
            cols = question.targetCols;
            rowsSlider.value = String(rows);
            colsSlider.value = String(cols);
            redraw();
          }
        },
      }
    );
  });

  container.appendChild(
    h('div', { class: 'array-builder' }, [
      h('div', { class: 'array-controls' }, [
        h('label', {}, [rowsLabel, rowsSlider]),
        h('label', {}, [colsLabel, colsSlider]),
      ]),
      grid,
      total,
      checkBtn,
    ])
  );
}

// Fill-in: typed numeric or short-text answer.
import { h } from '../components.js';

export function render(container, question, { attemptAnswer }) {
  const input = h('input', { class: 'text-input', type: 'text', inputmode: 'numeric', placeholder: '?' });
  const submit = h('button', { class: 'btn btn--accent', type: 'button' }, 'בדוק');
  const submitAnswer = () => {
    attemptAnswer(input.value, {
      onRetryVisual: () => {
        input.value = '';
        input.focus();
      },
      onFinalVisual: () => {
        input.disabled = true;
        submit.disabled = true;
      },
    });
  };
  submit.addEventListener('click', submitAnswer);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submitAnswer();
  });
  container.appendChild(h('div', { class: 'fill-row' }, [input, submit]));
  setTimeout(() => input.focus(), 50);
}

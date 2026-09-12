// Fair share: drag tokens equally into buckets (division as equal grouping).
import { h, makeDraggable } from '../components.js';

export function render(container, question, { attemptAnswer, isAnswered }) {
  const bucketCounts = new Array(question.divisor).fill(0);
  const bucketEls = [];
  const dropTargets = [];
  const bucketsRow = h('div', { class: 'fairshare-buckets' });
  for (let i = 0; i < question.divisor; i++) {
    const bucketEl = h('div', { class: 'fairshare-bucket' });
    bucketEls.push(bucketEl);
    dropTargets.push({ el: bucketEl, id: i });
    bucketsRow.appendChild(bucketEl);
  }

  const bank = h('div', { class: 'fairshare-bank' });
  const tokens = [];

  function placeToken(rec, bucketIndex) {
    if (isAnswered()) return;
    if (rec.bucketIndex !== null) bucketCounts[rec.bucketIndex]--;
    rec.bucketIndex = bucketIndex;
    bucketCounts[bucketIndex]++;
    bucketEls[bucketIndex].appendChild(rec.el);
    if (tokens.every((t) => t.bucketIndex !== null)) checkAll();
  }

  for (let i = 0; i < question.dividend; i++) {
    const token = h('div', { class: 'fairshare-token' }, '🔵');
    const rec = { el: token, bucketIndex: null };
    tokens.push(rec);
    makeDraggable(token, () => dropTargets, (bucketIndex) => placeToken(rec, bucketIndex));
    token.addEventListener('click', () => {
      if (isAnswered()) return;
      const target = bucketCounts.indexOf(Math.min(...bucketCounts));
      placeToken(rec, target);
    });
    bank.appendChild(token);
  }

  function checkAll() {
    attemptAnswer(bucketCounts.slice(), {
      onRetryVisual: () => {
        tokens.forEach((t) => {
          t.bucketIndex = null;
          bank.appendChild(t.el);
        });
        bucketCounts.fill(0);
      },
      onFinalVisual: () => {
        bucketEls.forEach((el, i) => el.classList.add(bucketCounts[i] === question.answer ? 'correct' : 'wrong'));
      },
    });
  }

  container.appendChild(bucketsRow);
  container.appendChild(bank);
}

// Smoke test for the learning game. Not exhaustive, but exercises every
// question-type module, the retry-then-reveal flow, the subtopic filter,
// match-pairs undo, and the boss battle - the areas most likely to break
// silently after a refactor. Run with `npm test` (needs `npm install` and
// `npx playwright install chromium` once, since this repo has no build
// step or CI of its own - see README).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css' };

let failures = 0;
function check(name, condition) {
  if (condition) console.log(`  ok   - ${name}`);
  else {
    console.log(`  FAIL - ${name}`);
    failures++;
  }
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html');
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, () => resolve({ server, port: server.address().port }));
  });
}

// Answers whatever question is currently showing, generically, exercising
// both the retry branch and the final branch of the shared attempt flow.
// Returns the question-type it detected, or null if none matched.
async function answerCurrentQuestion(page) {
  const hasContinue = () => page.$('button:has-text("להמשיך")');

  if (await page.$('.drop-slot')) {
    let tile = await page.$('.drag-tile:not(.disabled)');
    if (tile) await tile.click();
    await page.waitForTimeout(120);
    if (!(await hasContinue())) {
      tile = await page.$('.drag-tile:not(.disabled)');
      if (tile) await tile.click();
    }
    return 'multiple-choice';
  }
  if (await page.$('.fill-row')) {
    await page.fill('.fill-row .text-input', '1');
    await page.click('.fill-row .btn');
    await page.waitForTimeout(120);
    if (!(await hasContinue())) {
      await page.fill('.fill-row .text-input', '2');
      await page.click('.fill-row .btn');
    }
    return 'fill-in';
  }
  if (await page.$('.match-defs')) {
    for (let round = 0; round < 2; round++) {
      const slots = await page.$$('.match-drop-slot');
      const emptyIdx = [];
      for (let i = 0; i < slots.length; i++) {
        if ((await slots[i].textContent()).includes('גררו')) emptyIdx.push(i);
      }
      const chips = await page.$$('.match-bank .drag-tile');
      for (let k = 0; k < chips.length && k < emptyIdx.length; k++) {
        await chips[k].click();
        await page.waitForTimeout(60);
        await slots[emptyIdx[k]].click();
        await page.waitForTimeout(60);
      }
      if (await hasContinue()) break;
    }
    return 'match-pairs';
  }
  if (await page.$('.array-builder')) {
    await page.click('.array-builder button');
    await page.waitForTimeout(120);
    if (!(await hasContinue())) await page.click('.array-builder button');
    return 'array-builder';
  }
  if (await page.$('.fairshare-buckets')) {
    const tokens = await page.$$('.fairshare-token');
    for (const t of tokens) {
      await t.click();
      await page.waitForTimeout(20);
    }
    return 'fair-share';
  }
  if (await page.$('.fracmul-grid-wrap')) {
    await page.click('.fracmul-grid-wrap button:has-text("בדוק")');
    await page.waitForTimeout(120);
    if (!(await hasContinue())) await page.click('.fracmul-grid-wrap button:has-text("בדוק")');
    return 'fraction-multiply';
  }
  if (await page.$('.fraction-pair')) {
    await page.click('.fraction-pair button:has-text("בדוק")');
    await page.waitForTimeout(120);
    if (!(await hasContinue())) await page.click('.fraction-pair button:has-text("בדוק")');
    return 'fraction-equivalent';
  }
  if (await page.$('.fraction-row')) {
    await page.click('.fraction-row button:has-text("בדוק")');
    await page.waitForTimeout(120);
    if (!(await hasContinue())) await page.click('.fraction-row button:has-text("בדוק")');
    return 'fraction-build';
  }
  return null;
}

async function advance(page) {
  const cont = await page.$('.question-card button:has-text("להמשיך")');
  if (cont) {
    await cont.click();
    await page.waitForTimeout(120);
  }
  const overlayBtn = await page.$('.overlay__card button');
  if (overlayBtn) {
    await overlayBtn.click();
    await page.waitForTimeout(120);
  }
}

async function main() {
  const { server, port } = await startServer();
  const baseUrl = `http://localhost:${port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 950 } });

  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (msg) => {
    const t = msg.text();
    if (msg.type() === 'error' && !t.includes('fonts.googleapis') && !t.includes('ERR_CONNECTION_RESET')) {
      pageErrors.push(t);
    }
  });

  console.log('Player + quest menu');
  await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.title');
  await page.fill('.text-input', 'טסט');
  await page.click('.avatar-picker .avatar-option:nth-child(1)');
  await page.click('button:has-text("צור שחקן")');
  await page.waitForSelector('.grid .card');
  const questCards = await page.$$('.grid .card');
  check('quest menu shows 2 quests', questCards.length === 2);

  // Mixed practice intentionally gates harder kinds behind level tier (a
  // fresh player should only see basics), so it won't show every type for
  // a brand-new player - that's correct behavior, not a bug. Subtopics
  // bypass that gating on purpose, so sweep those instead to confirm every
  // renderer the multiplication topic can produce actually works. (Note:
  // match-pairs never occurs in this topic - only biotech uses it, and
  // that's covered separately below.)
  console.log('Multiplication quest: sweep every subtopic\'s question types');
  await page.click('.grid .card:nth-child(1)');
  await page.waitForSelector('.title:has-text("מה נתרגל היום")');

  const EXPECTED_MATH_TYPES = new Set([
    'multiple-choice',
    'fill-in',
    'array-builder',
    'fair-share',
    'fraction-build',
    'fraction-equivalent',
    'fraction-multiply',
  ]);
  const seenTypesMath = new Set();
  let ltrSeen = false;
  const mathSubtopics = ['עובדות כפל', 'חילוק', 'בעיות "פי כמה"', 'בעיות מילוליות', 'שברים'];
  for (const subtopicName of mathSubtopics) {
    await page.click(`.card:has-text('${subtopicName}')`);
    await page.waitForSelector('.question-card__prompt');
    for (let i = 0; i < 10; i++) {
      const prompt = await page.$('.question-card__prompt');
      if ((await prompt.getAttribute('dir')) === 'ltr') ltrSeen = true;
      const type = await answerCurrentQuestion(page);
      if (type) seenTypesMath.add(type);
      await advance(page);
    }
    await page.click('.top-bar .icon-btn'); // game -> subtopic-select, ready for the next one
    await page.waitForSelector('.title:has-text("מה נתרגל היום")');
  }
  check('LTR direction applied to at least one math prompt', ltrSeen);
  check(
    `saw every renderer the multiplication topic uses (saw: ${[...seenTypesMath].sort().join(', ')})`,
    EXPECTED_MATH_TYPES.size === seenTypesMath.size && [...EXPECTED_MATH_TYPES].every((t) => seenTypesMath.has(t))
  );

  console.log('Subtopic filter: division-only');
  // already at pop-star's subtopic-select screen from the loop above
  await page.click('.card:has-text("חילוק")');
  await page.waitForSelector('.question-card__prompt');
  let allDivisionish = true;
  for (let i = 0; i < 6; i++) {
    const prompt = await page.textContent('.question-card__prompt');
    if (!prompt.includes(':') && !prompt.includes('מנה') && !prompt.includes('שווה')) allDivisionish = false;
    await answerCurrentQuestion(page);
    await advance(page);
  }
  check('subtopic filter only shows division-flavored questions', allDivisionish);

  console.log('Match-pairs undo (biotech genetics subtopic)');
  await page.click('.top-bar .icon-btn'); // game screen -> subtopic-select
  await page.waitForSelector('.title:has-text("מה נתרגל היום")');
  await page.click('.top-bar .icon-btn'); // subtopic-select -> quest menu
  await page.waitForSelector('.grid .card');
  await page.click('.grid .card:nth-child(2)'); // biotech quest
  await page.waitForSelector('.title:has-text("מה נתרגל היום")');
  await page.click('.card:has-text("DNA וגנטיקה")');
  await page.waitForSelector('.question-card__prompt');

  let foundMatch = false;
  for (let i = 0; i < 15 && !foundMatch; i++) {
    if (await page.$('.match-defs')) {
      foundMatch = true;
      const chips = await page.$$('.match-bank .drag-tile');
      const slots = await page.$$('.match-drop-slot');
      await chips[0].click();
      await slots[0].click();
      await page.waitForTimeout(100);
      const bankBefore = (await page.$$('.match-bank .drag-tile')).length;
      // tap the placed chip to send it back
      const placedChip = await slots[0].$('.drag-tile');
      await placedChip.click();
      await page.waitForTimeout(100);
      const bankAfter = (await page.$$('.match-bank .drag-tile')).length;
      check('tapping a placed match-pairs chip returns it to the bank', bankAfter === bankBefore + 1);
      break;
    }
    await answerCurrentQuestion(page);
    await advance(page);
  }
  check('found a match-pairs question to test undo on', foundMatch);

  console.log('Boss battle (win path)');
  await page.click('.top-bar .icon-btn');
  await page.waitForSelector('.title:has-text("מה נתרגל היום")');
  await page.click('.card--boss');
  await page.waitForSelector('.boss-hud');

  function evalFact(text) {
    let m = text.match(/(\d+)\s*×\s*(\d+)/);
    if (m) return Number(m[1]) * Number(m[2]);
    m = text.match(/(\d+)\s*:\s*(\d+)\s*=\s*\?$/);
    if (m) return Number(m[1]) / Number(m[2]);
    return null;
  }
  let bossOutcome = null;
  for (let i = 0; i < 12 && !bossOutcome; i++) {
    const prompt = await page.textContent('.question-card__prompt');
    const answer = evalFact(prompt);
    if (await page.$('.boss-choice-row')) {
      const buttons = await page.$$('.boss-choice-btn');
      let clicked = false;
      if (answer !== null) {
        for (const b of buttons) {
          if (Number(await b.textContent()) === answer) {
            await b.click();
            clicked = true;
            break;
          }
        }
      }
      if (!clicked) await buttons[0].click();
    } else {
      await page.fill('.fill-row .text-input', answer !== null ? String(answer) : '1');
      await page.click('.fill-row .btn');
    }
    await page.waitForTimeout(150);
    const overlay = await page.$('.overlay__card');
    if (overlay) {
      bossOutcome = await overlay.textContent();
      break;
    }
    const cont = await page.$('button:has-text("להמשיך בקרב")');
    if (cont) {
      await cont.click();
      await page.waitForTimeout(150);
    }
  }
  check('boss battle reached an outcome (win or lose)', bossOutcome !== null);

  await browser.close();
  server.close();

  check('no page errors or console errors during the whole run', pageErrors.length === 0);
  if (pageErrors.length) console.log('Errors seen:', pageErrors);

  console.log(failures === 0 ? `\nAll checks passed.` : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();

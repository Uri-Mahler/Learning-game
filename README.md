# משחקי למידה — Learning Game

A modular, browser-only educational game for kids, in Hebrew. Plain HTML/CSS/JavaScript (ES modules) — no build step, no backend, deployable for free on GitHub Pages.

## Core idea: topic × theme

- **Topic** = what's practiced (grade-level subject questions).
- **Theme** = how it looks/feels (colors, mascot, reward vocabulary).
- A **quest** (`config/quests.json`) pairs one topic with one theme. Topics and themes are independent config files — mix and match freely.

Two quests ship out of the box:

| Quest | Topic | Theme |
|---|---|---|
| מצעד הכפל | 4th-grade multiplication & division (`config/topics/multiplication-4th-grade.json`) | Pop-star / music chart (`config/themes/pop-star.json`) |
| משימת הביוטק הגלקטית | 7th-grade biotech basics (`config/topics/biotech-7th-grade.json`) | Space Academy (`config/themes/space-academy.json`) |

## Player vs. quest

A **player** is a kid's save-slot (name + avatar), picked once on this device. From the quest menu they can jump into any quest, and switch anytime via the 🏠 button mid-game — progress for each quest is saved independently per player, so switching never loses anything.

## Running locally

Because config is loaded with `fetch()`, opening `index.html` directly (`file://`) will **not** work in most browsers (CORS blocks local file fetches). Serve it over http instead:

```bash
# any of these work
python3 -m http.server 8000
npx serve .
```

Then open `http://localhost:8000`.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. Repo Settings → Pages → Deploy from branch → pick `main` (or your default branch) and `/ (root)`.
3. Your game is live at `https://<user>.github.io/<repo>/` — no build step needed.

## Adding a new topic

1. Add `config/topics/<topic-id>.json` with `id`, `name`, `grade`, `subject`, `providerModule`, `pointsPerLevel`, and either:
   - `levels` (an array of difficulty-tier params) for a **procedurally generated** topic, or
   - `questionBank` (an array of question objects with a `tier` field) for a **static question bank**.
2. Add `js/topics/<providerModule>.js` exporting `createProvider(topicConfig)` that returns `{ getNextQuestion(tierIndex, recentIds) }`. See `js/topics/multiplication-4th-grade.js` (generated) and `js/topics/biotech-7th-grade.js` (static bank) for the two patterns.
3. Question shape returned by `getNextQuestion`:
   - Multiple choice: `{ id, type: 'multiple-choice', prompt, choices: [{label, value}, ...], answer, explanation? }`
   - Fill-in (numeric): `{ id, type: 'fill-in', prompt, answer: <number>, explanation? }`
   - Fill-in (text): `{ id, type: 'fill-in', prompt, acceptedAnswers: [<string>, ...], explanation? }`

## Adding a new theme

Add `config/themes/<theme-id>.json` with `id`, `name`, `mascotEmoji`, `colors` (primary/secondary/accent/bg/bgAlt/text/textOnPrimary), `vocabulary` (points/streak/level/levelUp/menu/switchPlayer/start/resumeQuest/continueBtn/correct[]/wrong[]) and `levelNames` (an array — one name per level, reused for levels beyond the array length). Colors apply automatically as CSS variables at runtime; no CSS file is required. `css/themes/*.css` files are optional extra decorative flair (background gradient) keyed by `data-theme`.

## Adding a new quest

Add an entry to `config/quests.json`: `{ id, name, description, topicId, themeId }`. It shows up in the quest menu automatically.

## Progress storage

Everything is stored in `localStorage`, keyed per player and quest — no login, no server. Clearing site data in the browser resets progress.

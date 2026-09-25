# Skill Tree

Paste your notes or name a topic, and study it as a skill tree. Each concept is a topic with flashcards, multiple-choice and true/false cards. You unlock a topic by mastering the topics it builds on.

**Live:** _add the Vercel link here_ · **Failure demo:** add `?chaos` to the URL

> **Screenshot / GIF:** _add here_

---

## Setup

Requires Node 20.3 or newer and a free [Gemini API key](https://aistudio.google.com/apikey).

```bash
npm install
cp .env.example .env      # then put your key in .env as GEMINI_API_KEY=...
npm start                 # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm start` | Runs the app **and** the API on one port (the API runs through a small Vite dev middleware) |
| `npm test` | Runs the 150 unit tests (Vitest). No network or API key needed |
| `npm run build` | Type-checks, then builds for production |

| Environment variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | yes | Only ever read on the server. It never has a `VITE_` prefix, so Vite cannot put it in the browser bundle |
| `GEMINI_MODEL` | no | Defaults to `gemini-3.5-flash-lite` |

Deploying: import the repo in Vercel (framework preset **Vite**) and add `GEMINI_API_KEY` in the project settings. `vercel.json` raises the function time limit to 30 s and bundles `fixtures/` for Chaos Mode.

---

## Using it

1. Paste lecture notes (200+ characters counts as **notes**) or type a topic. Or click one of the examples.
2. Pick **Continue** or any blue tile. Answer the cards in the side panel. Before each answer you can say how sure you are.
3. Get every card in a topic right and it completes. The topics that depend on it unlock, and the connecting line draws itself.
4. Wrong answers go to **Review mistakes**. Cards you got wrong while marked *Certain* come first.
5. When every topic is complete, the **Final test** unlocks: a timed quiz mixing questions from all topics.

The background follows the content. Pasted notes get a **notebook**, a math topic gets **graph paper** and any other topic gets a **chalkboard**.

Keyboard: `1–4` answer · `T` / `F` true/false · `Space` flip · `1` / `2` missed it / got it · `←` `→` move · `Esc` close.

---

## How it works

```
browser                                     server (Vercel function)                       Gemini
───────                                     ────────────────────────                       ──────
text ──► requester (abort old + request id) ──► /api/generate
                                                 check input
                                                 build prompt (shape + rules + notes) ─────► JSON mode
                                                 parse ◄──────────────────────────────────── raw text
                                                 validate + salvage ── unusable? ──► repair prompt, once
                                            ◄── { tree, report, repaired } or { error: { kind, message } }
validate again (same code)
render tree · study · progress reducer
```

- **Structured output, then real validation.** Gemini's JSON mode only guarantees valid *syntax*. `src/lib/validate.ts` checks everything else, card by card and topic by topic. It's a set of pure functions shared by the server and the browser. The browser re-validates the server's answer too, because nothing that comes over the network is trusted.
- **The tree logic is pure too.** Levels, unlocking, status and "what's next" live in `src/lib/tree.ts`. Progress is a reducer (`src/lib/progress.ts`). Components only render.
- **No UI or state libraries.** React, TypeScript and plain CSS. Vitest is the only extra dev tool.

### Data shape

```ts
SkillTree = { title, subject: 'math' | 'theory', nodes: TopicNode[] }
TopicNode = { id, label, summary, prerequisites: string[], cards: Card[] }
Card      = flashcard { front, back }
          | mcq       { question, options, answerIndex, explanation }
          | truefalse { statement, answer, explanation }
          // every card: id (assigned by our code, never by the model), source? (quote from the notes)
```

---

## Handling bad AI output

The main idea: **repair or drop only the broken parts, and show what happened.** A response fails as a whole only when nothing usable is left.

| What goes wrong | What the app does |
|---|---|
| Reply wrapped in prose or a ```` ```json ```` fence | Cuts the JSON out and uses it, noted in the Repair Report |
| Malformed or cut-off JSON, wrong shape, empty reply | Sends the model its own reply plus the exact problems **once**. If that fails too, shows a specific error with Try again |
| MCQ `answerIndex` out of range, fewer than 2 options | Drops that card only |
| Duplicate options | Removes them and re-finds the answer **by its text**, so the correct answer can't shift |
| `"true"` / `"false"` as text | Converts it to a boolean |
| Card with missing fields or an unknown type | Drops that card only |
| Topic with no valid cards | Drops the topic and removes links to it |
| Duplicate topic IDs | Renames the second one (`id-2`) |
| Links to missing topics, self-links, repeated links | Removes those links |
| Prerequisite loop (A needs B, B needs A) | Breaks it by removing the link that points forward in the list |
| Too many topics / cards | Keeps the first 8 topics / 6 cards per topic |
| Unknown `subject` | Treats it as `theory` |
| Quote not found in the user's notes | Keeps the card but marks it **"Not found in your notes"** (Hallucination Check) |
| Gemini 503 overloaded / 429 rate limit | Retries once on the server after 1.5 s, then shows a specific message |
| Slow response | Elapsed seconds, a "still working" message, a Cancel button. The server gives up at 25 s and the browser at 30 s |
| Network down, server error, non-JSON error page | A specific message per kind (12 kinds, each with its own title and hint), with Try again re-sending the exact submitted text |
| **An older, slower response arriving after a newer one** | Starting a request aborts the previous one (the abort reaches the Gemini call), **and** a response is only used if its request id is still the latest |
| A component crashes while rendering | An error boundary shows "Start over". The input text is kept |

After every generation, a **Repair Report** under the title lists exactly what was fixed, dropped or retried, and which checks ran. A clean result says so.

### Chaos Mode

Open the app with **`?chaos`** to get a panel that makes the server return saved bad outputs from `fixtures/` **instead of calling Gemini**. The rest of the pipeline is the real code. The scenarios are: partially broken, broken-then-fixed (shows the repair retry), invented quotes, malformed, wrong shape, empty, slow (8 s), AI overloaded and server error.

To see the stale-response guard: pick **Slow** and build, then pick **Partially broken** and build again straight away. The slow answer never replaces the newer one.

---

## What's different about it

- **Salvage, don't fail, with a visible Repair Report.** Robustness you can see instead of taking it on trust.
- **Hallucination Check.** For pasted notes, every card must quote them. The app checks each quote against the notes (whole words, ignoring case and punctuation; quotes of 4+ words may match 85% of their words in order). Unmatched quotes are flagged.
- **Chaos Mode.** Every failure path can be demonstrated in about 30 seconds.
- **Confidence-weighted review.** Wrong answers you were *certain* about are the most dangerous misconceptions, so they are highlighted and reviewed first.
- **Fix this card.** Regenerates one card (validated with the same rules) without touching the rest of the tree or your progress.
- **Final test.** Unlocks when every topic is complete: a timed quiz with questions drawn from every topic in turn.

---

## Testing

`npm test` runs 150 tests in 13 files. They cover the validator against every fixture, the tree rules, the progress reducer, the stale-response race (two fake requests resolving in the wrong order), the timeouts (with fake timers), the API handlers (with a mocked `fetch`), the repair retry, Chaos Mode, the Hallucination Check, the review order and the final test. The tests never call Gemini.

`fixtures/` holds hand-written model outputs: one valid tree and a set of broken ones, all based on `notes-photosynthesis.txt`.

---

## Known limitations

- **Progress is not saved.** Refreshing the page loses the tree and your progress.
- **The free Gemini tier can be overloaded or rate-limited.** The app handles this, but generation can fail until it recovers.
- **The Hallucination Check is string matching,** not meaning. A correct paraphrase can be flagged, and a quote that exists but doesn't support the card will pass.
- **Cycle breaking is a heuristic.** It removes the link that points forward in the model's topic order, which is usually, but not always, the wrong one.
- **Math vs theory comes from the model.** A misclassified topic only changes the background.
- **Chaos fixtures are all about photosynthesis,** whatever you type.
- **Chaos Mode is enabled in production** behind `?chaos`. It only returns fixture data and never uses the API key.
- **Levels with many topics wrap onto several rows,** which makes the connecting lines harder to follow.
- **Tested in English only** and in recent Chrome/Edge/Firefox.

## What I'd do next

- Save sessions (tree + progress) in `localStorage`.
- Refinement prompts that edit the existing tree ("add a topic on X", "make it harder").
- Stream topics onto the tree as they are generated.
- A semantic Hallucination Check (embeddings) alongside the string match.
- Component tests with Testing Library for the panel and the final test.

---

## AI-usage note

This project was built with **Claude Code** as a pair programmer.

- **I decided** the idea, the requirements and the unique features (written as a handover before any code), the choice of Gemini, and the visual direction. I rejected four design mockups before approving the fifth, and chose the "background follows the subject" rule. I also set the working rules (no code comments, one feature per commit, I make every commit myself) and reviewed and tested each feature before it was ticked off.
- **Claude Code** drafted the build plan, and wrote most of the code and tests one feature at a time, explaining each piece. It also built the design mockups, diagnosed problems (npm being blocked on my network, Gemini returning 503 during development) and flagged design risks as they came up.
- Every feature was verified by running it, and the full test suite runs without network access.

---

## Time spent

_Fill in from the time log before submitting._

| Phase | Hours |
|---|---|
| Planning and design mockups | _?_ |
| Core (validation, API, tree, study loop) | _?_ |
| Failure handling | _?_ |
| Unique features | _?_ |
| Deploy and README | _?_ |
| **Total** | _?_ |

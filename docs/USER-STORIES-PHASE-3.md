# AgentTeam-Memory — User Stories (Phase 3)

> Third wave of expansion: **the experience of someone doing vibe coding via the terminal**. The vault stops being
> merely queryable/observable and starts to **work for the dev**: it distills memory into cheap context
> packs (more agent output without more tokens), **visualizes the system** (diagrams, dashboard,
> tree, sparklines) and delivers **daily-flow commands** (plan, standup, handoff, recap, todo).
>
> Continues the numbering of [Phase 2](./USER-STORIES-PHASE-2.md): starts at **US-048** (the base goes up to
> US-047) and at **F21** (the base goes up to F20). Architecture reference:
> [`ARCHITECTURE-PHASE-3.md`](./ARCHITECTURE-PHASE-3.md).

## Convention (inherited from Phases 1/2)

`<ref>` = loose reference to a note (exact basename → slug fragment → substring of
name/summary), resolved by `resolveNotes`. Every read tool accepts `--json` and, in that mode,
emits **only** `res.data`. Mutations rewrite via `formatNote` preserving unknown frontmatter.
Every tool is a file in `commands/` (auto-discovery), contract `{ name, summary, usage, run(ctx) }`
returning `{ ok, code?, lines?, data? }`. **Zero external dependency.**

## Guiding principles of this phase

1. **More agent output, same tokens.** The heavy work (ranking, summarizing, counting, rendering) is
   **local and heuristic** — it does not consume the LLM. Commands like `brief`/`focus`/`recap` deliver to the agent
   an already-distilled pack, instead of making it scan the whole vault.
2. **Visuals that explain what is happening.** Mermaid diagrams, ANSI dashboard, tree, sparklines and
   heatmaps make the system state legible at a glance — in the terminal and in Obsidian.
3. **Testable determinism.** No clock/random in the tested render path: dates come from the
   notes, "now" is injectable. Each new tool has **≥ 5 tests** `node:test` without mocks.

## Phase map

| # | Feature | Tool | US | Cluster |
| --- | --- | --- | --- | --- |
| **F21** ⭐ | Mermaid diagram of the system/note graph | `diagram` | US-048 | Visual |
| **F22** | Overview dashboard in the terminal | `dashboard` | US-049 | Visual |
| **F23** | Visual tree of the notes | `tree` | US-050 | Visual |
| **F24** | Activity sparkline (notes/day) | `activity` | US-051 | Visual |
| **F25** | Calendar heatmap of creation | `heatmap` | US-052 | Visual |
| **F26** | Budgeted context-pack to seed the agent | `brief` | US-053 | Tokens |
| **F27** | Token estimator for notes/text | `tokens` | US-054 | Tokens |
| **F28** | Retrieval by token budget | `focus` | US-055 | Tokens |
| **F29** | Extractive summary (TL;DR) of a note/set | `tldr` | US-056 | Tokens |
| **F30** | Session recap in minimal tokens | `recap` | US-057 | Tokens |
| **F31** | Plan-note scaffold | `plan` | US-058 | Flow |
| **F32** | Cross-agent standup | `standup` | US-059 | Flow |
| **F33** | Handoff pack between sessions/agents | `handoff` | US-060 | Flow |
| **F34** | Aggregate/toggle checkboxes across notes | `todo` | US-061 | Flow |
| **F35** | Roadmap from decisions | `roadmap` | US-062 | Flow |
| **F36** | Surface blockers/risks | `blockers` | US-063 | Knowledge |
| **F37** | Glossary / index of terms | `glossary` | US-064 | Knowledge |
| **F38** | Progress metrics | `progress` | US-065 | Knowledge |
| **F39** | Changelog of decisions/learnings | `changelog` | US-066 | Knowledge |
| **F40** | Mermaid mindmap centered on a note/tag | `mindmap` | US-067 | Knowledge |
| cross-cutting | Orchestration slash-commands (Claude Code) | `.claude/commands/*` | US-068 | — |
| cross-cutting | Shared helpers (`render.mjs`, `analyze.mjs`) | — | US-069 | — |
| cross-cutting | Each tool with ≥ 5 tests; zero regression | — | US-070 | — |

---

## Visual Cluster — explain what is happening

### F21 — `diagram` (⭐): system diagram / note graph · US-048
**As a** lead **I want** to run `diagram` **so that** I get a **Mermaid diagram** of the system (the graph of
`[[wikilinks]]` between notes, or the structure by type/agent/tag) **so that** I see the memory's architecture
at a glance, in the terminal and pasteable into Obsidian. It is the engine behind the `/diagram`
slash-command, which sends multiple agents to architect the diagram (US-068).
- **Tool:** `diagram` · **Feature:** F21
- **Acceptance:**
  - `diagram [--scope links|tags|agents|types] [--save] [--json] [--all]`. Default `--scope links`.
  - `links`: nodes = notes, edges = `[[wikilinks]]` resolved by `wikilinksOf`; only connects edges whose
    target **exists** in the scope (does not invent a phantom node).
  - `tags`/`agents`/`types`: bipartite graph note↔(tag|agent|type), grouping by that dimension.
  - The output is a valid **` ```mermaid ` block** (`flowchart LR`); node ids are **sanitized**
    (`mermaidEscape`) — quotes, brackets, pipes and breaks become safe text, never break the parser.
  - `--save` persists as a `memory` note (tag `diagram`); `--json` returns `{ scope, nodes, edges }`.
  - Empty vault → valid diagram with a placeholder node and **exit 0** (never emits an invalid empty Mermaid).

### F22 — `dashboard`: overview dashboard · US-049
**As a** teammate **I want** to run `dashboard` **so that** I see, in a compact ANSI dashboard, the state of the
vault (count by type/agent, recent activity, pins, health) **so that** I get oriented without running 5
commands.
- **Tool:** `dashboard` · **Feature:** F22
- **Acceptance:**
  - Shows: project + enabled; total notes; breakdown **by type** and **by agent** with mini-bars;
    the N most recent notes; number of pins; number of orphans (without `[[links]]`).
  - Renders in **boxes** (`box`) with ANSI colors, degrading to plain text under `NO_COLOR`/`TERM=dumb`.
  - `--json` returns `{ project, enabled, total, byType, byAgent, recent, pins, orphans }`.
  - Empty vault → valid dashboard with zeros, **exit 0**.

### F23 — `tree`: visual tree of the notes · US-050
**As a** teammate **I want** to run `tree` **so that** I see the vault structure as a **tree** with
glyphs per type **so that** I navigate the memory like I navigate a directory.
- **Tool:** `tree` · **Feature:** F23
- **Acceptance:**
  - Groups by **project → type → note** (or `--by agent`), with `├─`/`└─` connectors and a glyph per type
    (memory `◆`, decision `★`, learning `✎`, communication `✉`, state `◉`).
  - `--depth N` limits the depth; `--all` covers all projects; `--json` returns the nested tree.
  - Each leaf shows `name` + short `summary` (truncated, without leaking width). Empty vault → clear empty tree.

### F24 — `activity`: activity sparkline · US-051
**As a** lead **I want** to run `activity` **so that** I see a **sparkline** of notes created per day
**so that** I feel the team's rhythm without reading a report.
- **Tool:** `activity` · **Feature:** F24
- **Acceptance:**
  - Counts notes per day in the window (`--days N`, default 14) from `created`; renders a
    unicode sparkline (`▁▂▃▄▅▆▇█`) + total + average + peak (day).
  - `--by agent|type` breaks the sparkline by dimension (one line each). `--json` returns
    `{ days, total, max, series: [{ date, count }] }`.
  - Window with no notes → flat sparkline (all `▁`) and **exit 0**; robust normalization (max 0 does not divide by zero).

### F25 — `heatmap`: calendar heatmap · US-052
**As a** lead **I want** to run `heatmap` **so that** I see a GitHub-style **calendar** of the creations
**so that** I identify gaps and peaks across the weeks.
- **Tool:** `heatmap` · **Feature:** F25
- **Acceptance:**
  - Grid weeks×weekdays (`--weeks N`, default 12) with an intensity glyph per quartile
    (` ·▪▩█` or 5 levels), legend and total count.
  - `--json` returns `{ weeks, cells: [{ date, count, level }] }`; levels derived from **quartiles** of the
    period (not fixed thresholds), with handling for all-zero.
  - Deterministic: "today" is injectable in the tests; no dates → valid empty grid, **exit 0**.

---

## Tokens Cluster — more agent output, same tokens

### F26 — `brief`: budgeted context-pack · US-053
**As a** teammate **I want** to run `brief [<query>] --budget N` **so that** I receive a **distilled context
pack** (pins + recents + notes relevant to the query) **within a token budget** **so that** I start the task already with the right memory, without scanning the whole vault (direct saving
of LLM tokens).
- **Tool:** `brief` · **Feature:** F26
- **Acceptance:**
  - Prioritized selection: **pins** → relevance to `<query>` (if any) → recency; each note enters as
    `title — summary` (body only with `--full`), stopping when the **token budget** (`--budget`,
    config default, fallback 1500) would be overflowed by the next note.
  - Estimates tokens with `estimateTokens` (`analyze.mjs`); reports `usedTokens`/`budget`/`included`/`dropped`.
  - `--json` returns `{ budget, usedTokens, notes: [{ name, tokens }], dropped }`. Never exceeds the
    budget (the last note that does not fit is **dropped**, not truncated in the middle — predictable contract).
  - No notes → clear empty pack, **exit 0**.

### F27 — `tokens`: token estimator · US-054
**As a** maintainer **I want** to run `tokens [<ref>|--text "..."]` **so that** I estimate how many tokens a
note (or a set, or a text) would cost **so that** I size what I send to the agent.
- **Tool:** `tokens` · **Feature:** F27
- **Acceptance:**
  - `tokens <ref>` estimates the note; `tokens --all`/no ref aggregates the project; `tokens --text "..."` estimates
    a standalone text. Deterministic heuristic (`estimateTokens`): ~chars/4 adjusted by words,
    documented and stable (same input → same number).
  - Output per note: `name — N tok`; aggregated: total + average + top-N largest. `--json` returns
    `{ total, perNote: [{ name, tokens }] }` (or `{ text, tokens }`).
  - A nonexistent `<ref>` → clear error, **exit 1**; empty text → `0`, **exit 0**.

### F28 — `focus`: budget retrieval · US-055
**As a** teammate **I want** to run `focus <query> --budget N` **so that** I receive **only** the highest-value
notes for the query that fit the budget **so that** I focus the agent without noise.
- **Tool:** `focus` · **Feature:** F28
- **Acceptance:**
  - Ranks notes by relevance to `<query>` (tags > summary terms > title/body terms, reuse
    of the scorer from `analyze.mjs`), then does a **budget fill** of tokens like `brief`.
  - `--top N` limits by count; `--budget N` limits by tokens; both compose (whichever overflows first).
  - `--json` returns `[{ name, score, tokens }]` ordered by score. Empty query → usage error, **exit 1**;
    no candidates → clear empty list, **exit 0**.

### F29 — `tldr`: extractive summary · US-056
**As a** teammate **I want** to run `tldr <ref>` **so that** I get a short **extractive summary** of the note
(or of a set) **so that** I do not re-read the whole body.
- **Tool:** `tldr` · **Feature:** F29
- **Acceptance:**
  - Extracts the N highest-weight sentences (frequency of non-stopword terms, bonus for the 1st sentence and for
    sentences with title terms) — no LLM, deterministic. `--sentences N` (default 3).
  - `tldr <ref>` summarizes one note; no ref/`--all` summarizes the set (1 line per note: `name — sentence`).
  - `--json` returns `{ name, summary, sentences: [...] }`. A note with no body → falls back to the `summary` from the
    frontmatter; totally empty → empty string, **exit 0**. An ambiguous/nonexistent `<ref>` → error, **exit 1**.

### F30 — `recap`: session recap in minimal tokens · US-057
**As a** lead **I want** to run `recap [--since <date>]` **so that** I get an **ultra-compact summary** of what
happened in the window (decisions, deliveries, communications, states) **so that** I resume the context spending
the minimum of tokens (complements `digest`/F14, which is verbose).
- **Tool:** `recap` · **Feature:** F30
- **Acceptance:**
  - Collects notes of the window (`--since`, default = today) and emits **dense bullets** grouped by type, at
    most `--max N` (default 12) bullets, each one `type: title` (+ short `summary` if it fits).
  - Prioritizes `decision`/`state` (high signal) over `communication` (noise); reports how many notes were
    left out. `--json` returns `{ since, total, shown, bullets: [...] }`.
  - Empty window → valid recap ("nothing in the window"), **exit 0**.

---

## Flow Cluster — day-to-day commands

### F31 — `plan`: plan scaffold · US-058
**As a** teammate **I want** to run `plan "<objective>"` **so that** I create an already-structured **plan
note** (objective, steps, risks, definition of done) **so that** I standardize the kickoff of a task.
- **Tool:** `plan` · **Feature:** F31
- **Acceptance:**
  - Creates a `memory` note (tag `plan`) with fixed sections (`## Goal`, `## Steps`, `## Risks`,
    `## Done when`); steps pre-populated from `--steps "a;b;c"` become checkboxes `- [ ]`.
  - Reuses the naming/filing and the writing of `save` (slug collision → suffix). `--json` returns
    `{ name, path, steps }`. Empty objective → usage error, **exit 1**, nothing written.

### F32 — `standup`: cross-agent standup · US-059
**As a** lead **I want** to run `standup [--since <date>]` **so that** I see, **per agent**, what each one
produced in the window **so that** I run the "daily" without asking anyone.
- **Tool:** `standup` · **Feature:** F32
- **Acceptance:**
  - Groups the notes of the window by **agent**; for each one lists deliveries (`type: title`), count and
    last known state (`state`). `--since` default = today.
  - `--json` returns `[{ agent, count, items, lastState }]` ordered by count desc. No activity →
    "no agent active in the window", **exit 0**.

### F33 — `handoff`: handoff pack · US-060
**As a** teammate **I want** to run `handoff` **so that** I generate a **handoff pack** (current state,
open items, next steps, key notes) **so that** the next session/agent resumes at no cost —
agent teams have no resume, so the handoff IS the continuity.
- **Tool:** `handoff` · **Feature:** F33
- **Acceptance:**
  - Gathers: the latest `state` per agent; open checkboxes (`- [ ]`) via the same extraction as `todo`;
    pins; the recent decisions. Emits cohesive markdown ready to paste at the start of the next session.
  - `--save` persists as a `memory` note (tag `handoff`) with wikilinks to the sources; `--json` returns
    `{ states, open, pins, decisions }`. Empty vault → valid minimal pack, **exit 0**.

### F34 — `todo`: aggregated checkboxes · US-061
**As a** teammate **I want** to run `todo` **so that** I see **all** the open checkboxes (`- [ ]`)
scattered across the notes in one place **so that** I do not lose a pending item **so that** I can mark them as done.
- **Tool:** `todo` · **Feature:** F34
- **Acceptance:**
  - Scans the body of the notes extracting `- [ ]` (open) and `- [x]` (done) items; lists the open ones per
    note with the source. `--done` also shows the completed ones; `--all` covers all projects.
  - `todo check <ref> "<text>"` toggles an item to `- [x]` in the note (rewrites the body via `formatNote`,
    preserving frontmatter); match by text substring, **requires** uniqueness (ambiguous → error, exit 1).
  - `--json` returns `{ open, done, items: [{ note, text, checked }] }`. No checkboxes → empty list, exit 0.

### F35 — `roadmap`: decisions roadmap · US-062
**As a** lead **I want** to run `roadmap` **so that** I see the **decisions** (`type: decision`) organized
on a timeline **so that** I communicate the project direction.
- **Tool:** `roadmap` · **Feature:** F35
- **Acceptance:**
  - Collects `decision` (and `--include learning`), orders by `created`, groups by month (`YYYY-MM`) and emits
    markdown `## YYYY-MM` + bullets `title — summary`. `--save` persists; `--json` returns
    `{ months: [{ month, items }] }`.
  - No decisions → clear empty roadmap, **exit 0**.

---

## Knowledge Cluster — densify and measure the memory

### F36 — `blockers`: blockers/risks · US-063
**As a** lead **I want** to run `blockers` **so that** I see the notes marked as **risk/blocker**
(tag `blocker`/`risk`/`blocked` or checkbox `- [ ] ⚠`/keyword) **so that** I attack what is blocking the team.
- **Tool:** `blockers` · **Feature:** F36
- **Acceptance:**
  - Selects notes by risk tags **or** by markers in the body (`blocked`, `blocker`, `risco`,
    `⚠`), case-insensitively; lists `name — reason (tag/line)`.
  - `--json` returns `[{ name, reason, source }]`. No blockers → "no blocker", **exit 0**.

### F37 — `glossary`: glossary of terms · US-064
**As a** librarian **I want** to run `glossary` **so that** I extract an **index of terms** recurring in the
summaries/titles with the notes where they appear **so that** I give the team a common vocabulary.
- **Tool:** `glossary` · **Feature:** F37
- **Acceptance:**
  - Extracts significant terms (non-stopword, freq ≥ `--min`, default 2), orders by frequency and
    lists each term with the source notes (top-N). `--json` returns `[{ term, count, notes }]`.
  - Reuses the stopword/tokenization from `analyze.mjs`. Empty vault → empty glossary, **exit 0**.

### F38 — `progress`: progress metrics · US-065
**As a** lead **I want** to run `progress` **so that** I see **percentages** of completion (checkboxes
done/total, plans with "done", decision/risk ratio) **so that** I measure the advance objectively.
- **Tool:** `progress` · **Feature:** F38
- **Acceptance:**
  - Computes: checkboxes `done/total` (% + bar), number of plans (tag `plan`) and how many have all items
    done, number of open blockers. Renders bars (`bar`) with color per severity.
  - `--json` returns `{ checkboxes: { done, total, pct }, plans: { total, complete }, blockers }`.
  - No data → all zero without division by zero, **exit 0**.

### F39 — `changelog`: changelog of decisions/learnings · US-066
**As a** maintainer **I want** to run `changelog [--since <date>]` **so that** I generate a **changelog** in
markdown from the `decision`/`learning` notes **so that** I publish what changed without writing it by hand.
- **Tool:** `changelog` · **Feature:** F39
- **Acceptance:**
  - Groups by date (`created`) descending; each entry `- **title** — summary` with a type badge
    (`[decision]`/`[learning]`). `--since` filters; `--save` persists; `--json` returns
    `{ since, entries: [{ date, type, title, summary }] }`.
  - Empty window → clear empty changelog, **exit 0**.

### F40 — `mindmap`: centered mindmap · US-067
**As a** teammate **I want** to run `mindmap <ref|--tag t>` **so that** I get a **Mermaid `mindmap`** centered
on a note (or tag) with its neighbors by link/tag **so that** I explore a topic visually. Complements
`diagram` (F21) with local focus — engine of the `/mindmap` slash-command.
- **Tool:** `mindmap` · **Feature:** F40
- **Acceptance:**
  - `mindmap <ref>`: root = the note; branches = `[[wikilinks]]` (1st level) and notes that share tags.
    `mindmap --tag <t>`: root = the tag; branches = notes with the tag. The output is a valid ` ```mermaid ` `mindmap`
    block with sanitized labels.
  - `--depth N` (default 1) expands neighbors; `--save`/`--json` (`{ root, branches }`). A nonexistent `<ref>`
    → error, **exit 1**; a tag with no notes → mindmap with only the root, **exit 0**.

---

## Cross-cutting

### US-068 — Orchestration slash-commands in Claude Code
**As a** vibe-coder **I want** slash-commands (`/diagram`, `/standup`, `/handoff`, `/recap`, `/plan`,
`/mindmap`) **that make memory-team use the engines above** **so that** I trigger multi-agent flows
without memorizing the CLI.
- **Delivery:** `.claude/commands/<name>.md` files that instruct the lead to (1) read the vault, (2) trigger
  the corresponding tool, (3) — in the case of `/diagram` and `/mindmap` — **fan-out of agents** that
  architect the diagram by subsystem and the reviewer consolidates.
- **Acceptance:** each file references the real tool and respects the protocol's output discipline
  (result + where the note landed, without narration). *(Prompt layer — validated by inspection, not by
  unit test; see US-070.)*

### US-069 — Shared helpers (DRY) and pure
**As a** maintainer **I want** the presentation and text analysis to live in **pure reusable
modules** (`render.mjs`, `analyze.mjs`) **so that** the 20 commands stay thin and the logic is
tested once.
- **Delivery:** `render.mjs` (ANSI/colors, `bar`, `sparkline`, `box`, `tree`, `heatGlyph`,
  `mermaidEscape`) and `analyze.mjs` (`estimateTokens`, `extractiveSummary`, `scoreByQuery`, stopwords),
  both **without** console I/O and without `process.exit` — only pure functions.
- **Acceptance:** imported by the commands; have their own tests; degrade colors under `NO_COLOR`/`TERM=dumb`;
  `estimateTokens` is deterministic and monotonic (larger text ⇒ ≥ tokens).

### US-070 — Every new tool comes with tests; zero regression
**As a** maintainer **I want** each of the 20 tools to have **≥ 5 tests** `node:test` with a temporary
vault **so that** I keep the suite green and prove that the base did not regress.
- **Acceptance:**
  - Each tool: in-process happy path + edge branches (empty vault, nonexistent/ambiguous `<ref>`, flags,
    `--json`); tools that mutate (`plan`, `todo check`, `*/--save`) ensure round-trip of unknown
    frontmatter via `formatNote`; tools with Mermaid validate the block and sanitization.
  - `npm test` passes **entirely**; the base's 34 tools + statusline **do not** change contract (the base
    suite stays green). New coverage target: **≥ 100 tests** (20 × 5).

# 20 prompts for day-to-day memory-team work

Ready-to-paste prompts for the **lead** (in `claude`, inside a project). Each one exercises the
agent team + the central memory vault. Replace the parts in `<brackets>`.
The prompts are in English (the team operates in English); the **explanation of each one is below it**:
it says **what the prompt does** and **how it uses the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once per project so the
> hooks start enforcing the memory discipline there (without it they stay fail-open and never block).

---

## A. Getting started

### 1. Bring up the full team
> Create an agent team named `memory-team` with `researcher`, `executor`, `reviewer`, and `librarian`. Before anything, each one reads the relevant memory (`search` + the project `_index.md` + its own state note). Talk to each other via `SendMessage`, log decisions on the board, and write one atomic note per deliverable with `--task <id>`. At the end, the `librarian` runs `index`.

**What it does:** brings up the four roles in peer mode, forces a *read-before-acting* step against the vault,
and defines the collaboration contract (mailbox + board + atomic notes). It is the default opening for
any non-trivial session.

### 2. Smoke test with two agents
> Create an agent team `memory-team` with just `researcher` and `reviewer`. The researcher finds one short fact about this repo, saves it (`save memory … --agent researcher --task <id>`), and `SendMessage`s it to the reviewer, who challenges it and saves a `learning`. They must exchange at least one direct message and log it on the board.

**What it does:** the minimal end-to-end check — it confirms that the teammates come up, talk
peer-to-peer, and that the notes reach the vault with valid frontmatter. Use it the first time on a new machine.

### 3. Enable memory enforcement in the project
> Run `node "<home>/.claude/memory-team/memory.mjs" enable` in this project, confirm `where` shows it as enabled, then summarize what the hooks will now enforce.

**What it does:** writes the `.memory-team` marker so that `TaskCompleted` blocks closing a task without a
note and `TeammateIdle` blocks going idle without a state flush — turning on the discipline for real work.

### 4. Recover context after a restart
> The team was stopped. Re-create `memory-team` and, before doing anything, have every teammate run `search` for the topics in the project `_index.md` and read their own state note, then report what was already decided and what is still open.

**What it does:** rebuilds the lost context from the vault alone — the proof that the memory survives
even though agent teams have no native session resume.

---

## B. Daily development

### 5. Research → implement a feature
> Goal: add `<feature>`. The `researcher` gathers the existing patterns in this codebase and any external docs, saves findings as `memory` notes, and hands them to the `executor` via `SendMessage`. The `executor` implements it and records a `decision` note explaining the approach and trade-offs (with `--task <id>`).

**What it does:** separates discovery from implementation so the executor never reinvents what is already
known; the two steps leave a durable trail linked to the task.

### 6. Reproduce and fix a bug
> Bug: `<describe>`. The `researcher` first searches the vault for prior notes about this area, then the `executor` reproduces it, fixes it, and saves a `learning` note with the root cause and the regression risk. The `reviewer` confirms the fix actually addresses the cause.

**What it does:** starts by asking "have we seen this before?", produces the fix, and captures the root cause as a
learning so the same class of bug stays searchable next time.

### 7. Refactor with a safety net
> Refactor `<module>` for clarity without changing behavior. The `executor` proposes the change and lists what could break; the `reviewer` plays devil's advocate against each claim before approving. Record the final rationale as a `decision` note.

**What it does:** couples the change to an adversarial check, and the decision note documents *why* the
refactor was safe — useful when someone revisits it months later.

### 8. Mobile task (Expo)
> In this Expo/React Native app, implement `<screen/feature>`. The `researcher` checks our existing navigation/state patterns in the vault, the `executor` builds it, and notes any EAS/build implications as a `memory` note tagged `expo`.

**What it does:** keeps mobile-specific knowledge (navigation, EAS quirks) accumulating under the
project, so the next mobile job starts from what already worked.

### 9. Cloudflare Worker task
> Add `<endpoint/binding>` to this Worker. The `executor` implements it and records the KV/secret/route decisions as a `decision` note tagged `cloudflare`; the `reviewer` checks for cold-start and limits issues.

**What it does:** captures infra decisions (bindings, routes, limits) that are easy to forget, and already
gets a review of the critical Worker points.

### 10. Plan before building
> Don't write code yet. The `researcher` and `reviewer` produce two competing plans for `<task>`, debate them via `SendMessage`, and the team records the chosen plan as a `decision` note with the rejected alternative noted for the record.

**What it does:** a design-only round; the decision note preserves both the winning plan and the discarded
option, so the reasoning is not lost.

---

## C. Memory operations

### 11. Consult memory before deciding
> Before we discuss `<topic>`, run `search <topic>` and `search <related-tag>` and summarize every relevant note (with its summary and tags) so we build on what we already know.

**What it does:** a pure *read* step you can use even without a full team — it surfaces prior decisions
and learnings so you don't contradict past work.

### 12. Consolidate and index (librarian)
> `librarian`: review today's new notes, merge duplicates into single `decision` notes (keep the trail), fix the `related`/`[[wikilinks]]`, standardize the tags, and run `index`. Report any note missing a `summary`.

**What it does:** the curation pass that keeps the vault navigable — it dedupes, connects, and regenerates
the project `_index.md` (MOC) and the master index.

### 13. Cross-project search
> Run `search <term> --all` and tell me which other projects already solved something like `<problem>`, linking the notes.

**What it does:** uses the per-project partition + the `global` space to reuse solutions across *all*
your repositories, not just the current one.

### 14. Promote a learning to global
> This insight applies to every project, not just this one. Save it with `--global` as a `learning` note, then have the `librarian` reindex.

**What it does:** files cross-cutting knowledge in `global/` so it shows up in the search of any
project, turning one-off lessons into reusable rules.

### 15. Onboard an existing project into memory
> This repo is new to the team. The `researcher` maps its architecture, key folders, and conventions and writes 3–5 atomic `memory` notes (one concept each, well tagged); the `librarian` indexes them so future sessions start informed.

**What it does:** kicks off a project's vault so the next team that opens it can `search` instead of
rediscovering the codebase.

---

## D. Quality and review

### 16. Adversarial diff review
> `reviewer`: review the current changes adversarially — assume there is a bug until proven otherwise. For each finding, state the test that would prove it, message the `executor`, and record confirmed issues as `learning` notes.

**What it does:** a skeptical pass focused on disproving correctness; confirmed issues become searchable
learnings instead of vanishing in the chat.

### 17. Security review
> The `researcher` lists the trust boundaries and inputs of `<feature>`; the `reviewer` probes each for injection, authz, and secret-handling issues. Record findings as `decision`/`learning` notes tagged `security`.

**What it does:** structures a security pass (map the surface → probe it) and leaves a tagged trail
you can audit later with `search security`.

### 18. Compare approaches (panel of judges)
> Have three teammates each propose a different approach to `<problem>` (e.g. simplest, most scalable, most familiar to our stack). They critique each other via `SendMessage`, then the team records the winning approach and why, with the runners-up noted.

**What it does:** generates diverse options and scores them via peer critique before deciding — better than
iterating on the first idea, and the reasoning stays preserved.

---

## E. Wrap-up and hygiene

### 19. End-of-session flush
> We're stopping. Every teammate writes/updates its `agents/<name>.md` state note (done / in progress / next step / open items), the `librarian` runs `index`, and you give me a 5-line summary of what's persisted.

**What it does:** satisfies the `TeammateIdle` gate and ensures the next session can resume from the
vault — the explicit "save the game" step.

### 20. Weekly retrospective from the vault
> `librarian`: read this project's notes from the last week, then write one `learning` note summarizing the recurring decisions, mistakes, and patterns, and link the source notes.

**What it does:** turns the accumulated notes into a higher-level lesson, so the memory gets *more*
useful over time, not just bigger.

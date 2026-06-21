# Multi-agent prompt — continuous improvement of AgentTeam-Memory

This file contains **ready-to-paste prompts for the lead** (in `claude`, inside this repository)
that bring up a `memory-team` agent-team to **improve the project end to end**, respecting
the repo's inviolable rules:

1. **Every change lives in a new branch** (`feature/<slug>`), and **each completed phase does a `git push`**.
2. **Everything that lands has a unit test** (`node:test`, temporary vault, no mocks) — green suite.
3. **Everything that lands is documented** (README/START/ARCHITECTURE/USER-STORIES + `system-guide.excalidraw`).
4. **memory-team protocol**: every teammate READS the memory before acting and WRITES one atomic note
   per deliverable (`save <type> … --task <id>`), communicates via `SendMessage`, and flushes state before going idle.

> The team operates in English; the explanations here are in PT-BR (the standard of the other `docs/` files).

---

## 0. Prerequisites (once per machine/project)

```bash
# memory-team installed in the user scope (~/.claude):
node install.mjs
# memory enforcement turned on IN THIS project:
node "C:/Users/mathe/.claude/memory-team/memory.mjs" enable
# test dependencies: none (zero-dependency). Sanity:
npm test
```

---

## 1. Master prompt — bring up the team and open the branch

Paste it into the lead. Replace `<OBJETIVO>` with the round's theme (e.g. "harden the vault validation" or
"add attachment support to notes").

> Create an agent team named `memory-team` with `researcher`, `executor`, `reviewer` and `librarian`.
> Goal: **<OBJETIVO>**. Working dir is this repo (`AgentTeam-Memory`).
>
> Hard rules for the whole run:
> 1. Create a new branch `feature/<slug-of-objective>` before any change. **Push at the end of every phase.**
> 2. Every new command/feature ships with a `node:test` file under `memory-team/test/` and the full suite (`npm test`) must stay green.
> 3. Every new command/feature is documented: update `README.md`, `docs/ARCHITECTURE.md`, `docs/USER-STORIES.md` and regenerate `docs/system-guide.excalidraw` (`node tools/build-guide.mjs`).
> 4. Follow the memory protocol: each teammate runs `search` + reads `_index.md` and its state note BEFORE acting, and `save`s one atomic note per deliverable citing `--task <id>`; log peer messages on the board; flush state before going idle. The `librarian` runs `index` at the end.
>
> Phase plan (push after each):
> - **Phase 1 — Understand**: `researcher` maps the relevant code (`memory-team/{lib,notes,memory}.mjs`, `commands/`, `hooks/`) and the vault, then writes/updates `docs/ARCHITECTURE.md` notes for the area of `<OBJETIVO>`. `reviewer` validates the plan adversarially.
> - **Phase 2 — Implement**: `executor` builds `<OBJETIVO>` as one or more `commands/<name>.mjs` (contract `{ name, summary, usage, run(ctx) }`, no `console.log`/`process.exit`, use `notes.mjs` helpers) **plus tests**.
> - **Phase 3 — Verify**: `reviewer` runs `npm test`, attacks edge cases (Windows paths, empty vault, ambiguous refs, `--json`), and confirms the 5 original commands still pass.
> - **Phase 4 — Document & index**: `executor`/`librarian` update the docs and regenerate the guide; `librarian` consolidates notes and runs `index`.
>
> Report a 5-line summary per phase and the commit hash you pushed.

---

## 2. Objective variations (thematic rounds)

Each bullet is a plug-and-play `<OBJETIVO>` for the master prompt:

- **Robustness**: "harden the CLI — add input validation, helpful error messages and exit codes to every command; add tests for malformed frontmatter and missing args."
- **Performance**: "cache the vault scan (`collectNotes`) within a single CLI invocation and benchmark `search`/`stats` on a 1k-note vault."
- **New capability — attachments**: "support attachments: a `attach <ref> <file>` command that copies a file next to a note and links it in the frontmatter, with `detach` and tests."
- **New capability — advanced search**: "extend `search` with boolean operators (`tag:`, `type:`, `agent:`, `--since`) and a relevance explanation; keep backward compatibility and tests."
- **Integration**: "add a `serve` command exposing the read commands over a tiny zero-dependency HTTP JSON API for dashboards."
- **Vault quality**: "add a `lint --fix` mode that normalizes frontmatter order, dedupes tags and repairs broken wikilinks, all behind a dry-run by default."
- **Observability**: "add a `log` command that appends structured audit entries and a `report` command that summarizes activity per agent/day."

---

## 3. Technical contract the agents MUST respect

A summary of what is in `docs/ARCHITECTURE.md` — paste it along if the agent has not read it yet:

```text
- New command = new file memory-team/commands/<name>.mjs. The registry does auto-discovery
  (scans the folder), so do NOT edit memory.mjs/registry.mjs/_ctx.mjs/lib.mjs.
- export default { name, summary, usage, run(ctx) }
  ctx = { ROOT, PROJECT, pos, opt, json, all }
  run returns { ok, code?, lines?, data? }  — never console.log/process.exit
  lines = human output; data = structured output (printed as JSON when --json)
- Data layer: memory-team/notes.mjs (collectNotes, resolveNotes, readNote, formatNote,
  wikilinksOf, tagHistogram, relOf, isArchived). Path/frontmatter helpers: lib.mjs.
- Test: memory-team/test/<name>.test.mjs with node:test + _helpers.mjs
  (makeVault, cleanup, run, runCli, seedNote). Real temporary vault, no mocks.
- install.mjs copies lib.mjs, notes.mjs, memory.mjs, commands/ and hooks/ — if you create a
  new runtime folder, update install.mjs.
```

---

## 4. Definition of Done (gate for each phase)

A phase only closes when **all** the items below are true — it is the checklist the `reviewer` applies:

- [ ] `npm test` green (including the 5 original commands and the smoke test).
- [ ] Every new command/feature has a dedicated test file covering the happy path + ≥2 edge cases.
- [ ] `node memory-team/memory.mjs help` lists the new command with the correct `usage`/`summary`.
- [ ] `--json` returns structured `data` for every read command.
- [ ] Docs updated: README (table), ARCHITECTURE, USER-STORIES and `system-guide.excalidraw` regenerated.
- [ ] One atomic note per deliverable in the vault, citing `--task <id>`, with `summary` in the frontmatter.
- [ ] `librarian` ran `index` (per-project `_index.md` + master updated).
- [ ] Commit in short imperative PT + **`git push`** of the phase.

---

## 5. Wrap-up

> We're done. Every teammate flushes its state note, the `librarian` runs `index`, you give me a
> 5-line summary of what shipped per phase with each pushed commit hash, then gracefully shut down
> the team (SendMessage `shutdown_request` to each teammate).

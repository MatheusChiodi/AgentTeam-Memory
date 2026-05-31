# memory-team — operating guide

## 1. Install (once per machine)
From the cloned project folder:
```bash
node install.mjs                 # default vault: ~/.claude/memory-vault
node install.mjs --vault D:/MyVault
```
Or inside Claude Code opened in this folder: `/setup` (optionally `/setup --vault D:/MyVault`).

This writes to the **user scope** (`~/.claude`): `settings.json` (merged + backup), `agents/`,
`memory-team/` (runtime), `CLAUDE.md` (protocol), and scaffolds the central vault.

## 2. Verify
```bash
node "<home>/.claude/memory-team/memory.mjs" where
```
Shows the vault path, the detected project (from the current folder), and whether it's enabled.

## 3. Bring up a team (in ANY project)
Open a terminal in the project, run `claude`, then paste a lead prompt.

**Smoke test first (2 agents):**
> Create an agent team named `memory-team` with 2 teammates: `researcher` and `reviewer`.
> First, each runs `node "<home>/.claude/memory-team/memory.mjs" search architecture` and reads the project `_index.md`.
> The `researcher` finds one short fact, saves it (`save memory ... --agent researcher --task <id>`),
> and `SendMessage`s it to the `reviewer`, who challenges it and saves a `learning`. They must exchange
> at least one direct message and log it on the board. Confirm the created notes before finishing.

**Full team (4 agents):**
> Create an agent team named `memory-team` with `researcher`, `executor`, `reviewer`, and `librarian`.
> Before starting, each reads relevant memory (`search` + project `_index.md` + their own state note).
> Have them talk via `SendMessage` and log decisions on the board. Each writes one atomic note per
> deliverable (with `--task <id>`). At the end, the `librarian` consolidates and runs `index`.

In-process display: `Shift+Down` cycles teammates, type to message the focused one, `Ctrl+T` toggles tasks.

## 4. Opt-in enforcement (recommended for real work)
At a project root, run once:
```bash
node "<home>/.claude/memory-team/memory.mjs" enable
```
This writes a `.memory-team` marker so the hooks enforce the discipline **in that project**:
- `TaskCompleted` blocks closing a task until a memory note references its `--task <id>`.
- `TeammateIdle` blocks idleness until the teammate flushed its state note.

Without the marker the hooks stay **fail-open** (never block) — safe for projects you don't want to track.

## 5. Memory layout (central vault)
```
<vault>/
├── _index.md                       # master MOC (lists projects)
├── projects/<project>/
│   ├── _index.md                   # per-project MOC (the librarian regenerates it)
│   ├── memory/  YYYY-MM-DD-<slug>.md
│   ├── board/   YYYY-MM-DD-<from>-to-<to>.md
│   ├── agents/  <name>.md          # teammate state (survives the session)
│   └── tasks/
└── global/                         # cross-project knowledge
    ├── memory/   board/
```
Open `<vault>` in Obsidian to navigate (wikilinks + the `_index.md` MOCs).

## 6. Day-to-day (5 lines)
1. `claude` in any project — agent teams + memory are already active (global install).
2. Ask the lead to create a team and distribute tasks; it manages the shared task list.
3. Teammates `search` before and `save` after; run `enable` once to make the hooks enforce it.
4. Browse `<vault>` in Obsidian; the `librarian` keeps `_index.md` and wikilinks coherent.
5. Restarted? Bring the team up again and tell each one to `search` — they recover context from the vault (no native teammate resume).

## Diagnostics
- Hook input schema: see `~/.claude/memory-team/hooks/.last-task-completed.json` and `.last-teammate-idle.json`
  (written on every fire). If field names differ, adjust the keys in `getp(...)` in `lib.mjs`/the hooks.
- Hooks are **fail-open**: any parse error or unknown identifier → they allow the action (never deadlock the team).

# AgentTeam-Memory — Feature & Usage Guide

A task-oriented tour of **everything the system does**: all **54 CLI commands** plus the standalone
status line and the orchestration slash commands. For each capability you get *what it is*, *when to
reach for it*, and *how to use it* with copy-paste examples. For the design rationale see
[ARCHITECTURE.md](./ARCHITECTURE.md); for the formal specs see [USER-STORIES.md](./USER-STORIES.md).

---

## How to invoke

```bash
# Installed (global) — works in every project:
node "~/.claude/memory-team/memory.mjs" <command> [args] [--flags]
# From a clone of this repo:
node memory-team/memory.mjs <command> [args] [--flags]

node memory-team/memory.mjs help        # the live list of every command
```

Conventions shared by every command:

- **`<ref>`** — a *loose reference* to a note, resolved by `resolveNotes`: exact basename → slug
  fragment → name/summary substring. An ambiguous `<ref>` is reported, never guessed.
- **`--json`** — every read command supports it and prints **only** the structured `data` (for
  pipelines, CI, and other agents).
- **`--all`** — scan every project partition instead of just the current project + global.
- **Scope** — the project is auto-detected from the working folder; cross-project notes live in
  `global/`. Override with `MEMORY_PROJECT`; override the vault with `MEMORY_VAULT`.
- **Non-destructive by default** — tools only write with `--save` / `--apply` / an explicit
  subcommand. Mutations rewrite via `formatNote`, preserving unknown frontmatter.

---

## 1. Core

| Command | What it does | Example |
| --- | --- | --- |
| `where` | Show vault path, detected project, enabled flag, note count, project list. | `… where` |
| `enable` | Opt-in: make the `TaskCompleted`/`TeammateIdle` hooks enforce memory in this project. | `… enable` |
| `save <type> "<title>"` | Write an atomic note (`memory\|decision\|learning\|communication\|state`). | `… save decision "Use Vite" --agent executor --summary "fast builds" --tags "build,tooling" --task 12` |
| `search <term\|tag>` | Rank notes for a term/tag across the project + global. | `… search cache --json` |
| `index [--all]` | Regenerate the per-project `_index.md` and master index (librarian only). | `… index` |

---

## 2. Navigation & reading

| Command | What it does | Example |
| --- | --- | --- |
| `list [filters]` | List notes with filters (`--type --tag --agent --project --since --limit --archived --all`). | `… list --type decision --since 2026-06-01` |
| `show <ref>` | Print a note resolved by reference. | `… show use-vite` |
| `recent [n]` | The N most recent notes (default 10). | `… recent 20` |

---

## 3. Tags

| Command | What it does | Example |
| --- | --- | --- |
| `tags` | Tag-frequency histogram across the project. | `… tags --all` |
| `tag <ref> [--add a,b] [--remove c,d]` | Add/remove tags on one note. | `… tag use-vite --add "decided"` |
| `retag <old> <new>` | Rename a tag across all notes. | `… retag wip in-progress` |

---

## 4. Knowledge graph (wikilinks)

| Command | What it does | Example |
| --- | --- | --- |
| `backlinks <ref>` | Notes that link **to** the target. | `… backlinks use-vite` |
| `links <ref>` | A note's outgoing wikilinks (resolved vs dangling). | `… links use-vite` |
| `graph` | Render the wikilink graph as **Mermaid** (resolved edges only). | `… graph --json` |
| `orphans` | Notes with no inbound and no outbound links. | `… orphans` |

---

## 5. Analytics, validation & lifecycle

| Command | What it does | Example |
| --- | --- | --- |
| `stats` | Totals, byType/byAgent/byProject, top tags, oldest/newest. | `… stats --all` |
| `timeline [--since]` | Notes grouped by creation day, newest first. | `… timeline --since 2026-06-01` |
| `validate` | Lint frontmatter + broken links; **exit 1** on any problem. | `… validate` |
| `dedupe` | Report suspected duplicates (same slug / identical summary). | `… dedupe` |
| `prune [--apply]` | Find empty/placeholder notes; dry-run unless `--apply` (which archives). | `… prune` |
| `archive <ref> [--restore]` | Move a note to `_archive/`; `--restore` brings it back. | `… archive stale-note` |
| `move <ref> <project>` | Relocate a note to another project. | `… move shared-fact global` |
| `rename <ref> <new title>` | Rename note + file + heading. | `… rename old-title "Better title"` |
| `export [--format json\|md] [--out f]` | Export notes (JSON bundle or concatenated Markdown). | `… export --format md --out backup.md` |
| `import <file> [--project p]` | Import notes from a JSON bundle. | `… import backup.json` |

---

## 6. Real-time, observability & productivity

| Command | What it does | Example |
| --- | --- | --- |
| `statusline.mjs` *(standalone)* | Render plan / context / cost in the Claude Code footer, every turn. | `node memory-team/statusline.mjs --demo` |
| `usage [--since] [--save]` | Historical cost/token ledger over session transcripts, by day & project. | `… usage --since 2026-06-01 --save` |
| `watch [--all]` | Live-tail: print each new note as teammates write it (Ctrl-C to stop). | `… watch` |
| `digest [--since] [--save]` | Markdown summary of a window, grouped by agent & type. | `… digest --since 2026-06-20 --save` |
| `doctor` | Read-only health check (vault, settings, hooks, statusline, integrity); exit 1 on failure. | `… doctor` |
| `config list \| get \| set` | Read/adjust preferences in `<vault>/config.json`. | `… config set statusline.warn 70` |
| `template list \| <name> "<title>"` | Scaffold a note from a built-in or `_templates/` template. | `… template decision "Pick a DB"` |
| `pin <ref> [--off] \| --list` | Pin a note so it floats to the top of search/list/recent. | `… pin use-vite` |
| `snapshot [--list] [--restore <id>]` | Checkpoint the vault; `--restore` is a true reset (safety snapshot first). | `… snapshot` |
| `relate <ref> [--apply]` | Suggest (or apply) `[[wikilinks]]` by tag/summary similarity. | `… relate use-vite --apply` |

---

## 7. Visualization — see the system at a glance

Render the state of the memory so you (and the agent) grasp it instantly — in the terminal and pasteable
into Obsidian.

### `diagram` — a Mermaid map of the whole system
Builds a Mermaid `flowchart`. `--scope links` (default) draws notes as nodes and `[[wikilinks]]` as
edges (only edges whose target exists — no phantom nodes). `--scope tags|agents|types` draws a
note↔dimension map. All labels go through a sanitizer, so a note titled `a]b"c|d` can never break the
parser. Persist it with `--save` (a `memory` note tagged `diagram`).

```bash
… diagram                       # the note/wikilink graph
… diagram --scope tags --save   # note↔tag map, saved into the vault
… diagram --json                # { scope, nodes, edges }
```

### `mindmap` — a focused Mermaid mindmap
Centers a `mindmap` on one note (root = the note; branches = its wikilinks + tag-siblings) or on a tag
(root = the tag; branches = its carriers). `--depth N` expands neighbors.

```bash
… mindmap use-vite              # explore around one note
… mindmap --tag cache --save    # everything tagged 'cache', saved
```

### `dashboard` — one-screen overview
An ANSI panel: project + enabled flag, total notes, breakdown by type and by agent (mini-bars), the
most recent notes, pin count, orphan count.

```bash
… dashboard
… dashboard --json   # { project, enabled, total, byType, byAgent, recent, pins, orphans }
```

### `tree` — the vault as a glyphed tree
Groups `project → type → note` (or `--by agent`) with `├─/└─` connectors and a glyph per type
(memory `◆`, decision `★`, learning `✎`, communication `✉`, state `◉`). `--depth N` limits depth.

```bash
… tree
… tree --by agent --depth 2
```

### `activity` — a sparkline of the team's rhythm
Counts notes created per day in a window (`--days N`, default 14) and renders a unicode sparkline plus
total / average / peak. `--by agent|type` draws one line per dimension.

```bash
… activity --days 30
… activity --by agent
```

### `heatmap` — a calendar heatmap of creation
A weeks × weekdays grid (`--weeks N`, default 12) with intensity bucketed by quartile — spot gaps and
streaks at a glance.

```bash
… heatmap --weeks 8
```

---

## 8. Context packs & token economy — more agent output, same tokens

The ranking, summarizing and budgeting run **locally** (deterministic heuristics) and never spend the
LLM. Instead of asking an agent to read the whole vault, hand it a distilled pack.

### `brief` — a token-budgeted context pack
Selects notes pins-first, then by relevance to an optional `<query>`, then by recency, and stops at the
token budget (`--budget`, default 1500). The note that would overflow is **dropped whole** — never
truncated — so the pack is always `≤ budget`. `--full` includes bodies.

```bash
… brief                         # the most important context right now
… brief cache layer --budget 800
… brief --json                  # { budget, usedTokens, notes:[{name,tokens}], dropped }
```

### `focus` — budgeted retrieval by query
Ranks notes by relevance to a query, then fills a budget. `--top N` caps the count, `--budget N` caps
tokens — whichever hits first.

```bash
… focus oracle migration --top 5
… focus auth --budget 1200 --json
```

### `tokens` — estimate token cost
Size a note, the whole project, or arbitrary text before sending it to an agent. Deterministic and
monotonic (longer text ⇒ never fewer tokens).

```bash
… tokens use-vite
… tokens --text "a paragraph I'm about to paste"
… tokens --all --json     # { total, perNote:[{name,tokens}] }
```

### `tldr` — an extractive summary
The top sentences of a note (or one line per note for a set), by term weight — no LLM. `--sentences N`
(default 3). Falls back to the frontmatter `summary` when a note has no body.

```bash
… tldr long-decision --sentences 2
… tldr --all
```

### `recap` — a minimal-token session recap
Dense bullets for a window (`--since`, default today), prioritizing `decision`/`state` over
`communication`, capped at `--max` (default 12). The cheap counterpart to the verbose `digest`.

```bash
… recap --since 2026-06-20
… recap --max 8 --json
```

---

## 9. Daily flow — terminal vibe-coding commands

### `plan` — scaffold a structured plan
Creates a `memory` note (tag `plan`) with fixed sections (`Goal`, `Steps`, `Risks`, `Done when`).
`--steps "a;b;c"` becomes `- [ ]` checkboxes (which `todo`/`progress` then track).

```bash
… plan "Migrate the build to Vite" --steps "install;configure;test;ship"
```

### `standup` — a cross-agent daily
Groups the window's notes by agent: deliverables (`type: title`), count, and last known state.

```bash
… standup --since 2026-06-20
… standup --json   # [{ agent, count, items, lastState }]
```

### `handoff` — continuity between sessions
Agent teams have no resume, so the handoff *is* the continuity. Assembles the latest state per agent,
open checkboxes, pins, and recent decisions into a packet to paste at the start of the next session.

```bash
… handoff --save   # also persists a 'handoff' note with wikilinks to the sources
```

### `todo` — every open checkbox in one place
Scans note bodies for `- [ ]` / `- [x]` and lists the open ones. `todo check <ref> "<text>"` flips a
single, uniquely-matched item to done (persisted via `formatNote`).

```bash
… todo                              # all open items, by note
… todo --done                       # include completed
… todo check migrate-build "test"   # mark the 'test' step done
```

### `roadmap` — direction from decisions
Groups `decision` notes (and `--include learning`) into a `YYYY-MM` timeline.

```bash
… roadmap --save
```

---

## 10. Knowledge & metrics

### `blockers` — what's stuck
Surfaces notes flagged as risk/blocked — by tag (`blocker`/`risk`/`blocked`) or a body marker
(`⚠`/`blocked`/`risco`), case-insensitive.

```bash
… blockers --json   # [{ name, reason, source }]
```

### `glossary` — shared vocabulary
A term index of recurring words across summaries/titles (frequency `≥ --min`, default 2), each term
mapped to its source notes.

```bash
… glossary --min 3
```

### `progress` — objective completion metrics
Checkboxes done/total (% + bar), how many `plan` notes are fully checked, and open blocker count.

```bash
… progress
… progress --json   # { checkboxes:{done,total,pct}, plans:{total,complete}, blockers }
```

### `changelog` — what changed
A Markdown changelog from `decision`/`learning` notes, by date, with a type badge.

```bash
… changelog --since 2026-06-01 --save
```

---

## 11. Slash commands (orchestration)

`.claude/commands/*.md` drive the agent team from inside Claude Code:

| Slash command | What it does |
| --- | --- |
| `/diagrama [--scope …]` | **Fan-out**: spawns agents to architect the system by subsystem, a reviewer consolidates, then the `diagram` engine materializes and saves the Mermaid. |
| `/mindmap <ref>\|--tag t` | Fan-out to explore a topic, then materializes a `mindmap`. |
| `/standup [--since]` | Wrapper that runs `standup` from the vault. |
| `/handoff [--save]` | Wrapper that builds the handoff packet. |
| `/recap [--since] [--max]` | Wrapper for the dense recap. |
| `/plano "<goal>" [--steps]` | Wrapper that scaffolds a plan note. |
| `/setup [--vault dir]` | Install/promote the system into `~/.claude`. |

---

## 12. Recipes — usage methods that combine tools

**Start a task with the right context, cheaply.**
```bash
… brief "the feature I'm about to build" --budget 1000   # seed the agent with a distilled pack
… plan "Build feature X" --steps "design;implement;test"  # scaffold the plan
```

**Run a daily and see where things stand.**
```bash
… standup --since 2026-06-20
… progress
… blockers
```

**Close a session so the next one resumes for free.**
```bash
… recap --since 2026-06-20      # quick mental snapshot
… handoff --save                # persist the continuity packet
… index                         # (librarian) refresh the MOC
```

**Understand an unfamiliar vault.**
```bash
… dashboard          # the overview panel
… tree               # structure
… diagram --save     # the wikilink graph as Mermaid
… glossary           # the shared vocabulary
```

**Keep the graph dense and healthy.**
```bash
… orphans            # find disconnected notes
… relate <ref> --apply   # suggest + wire up wikilinks
… validate           # lint frontmatter and links
```

**Watch cost/usage without leaving the flow.**
```bash
node memory-team/statusline.mjs --install   # passive footer, every turn
… usage --since 2026-06-01 --save           # historical ledger when you want detail
```

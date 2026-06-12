# AgentTeam-Memory

Give **Claude Code agent teams** a persistent, auditable, **per-project memory** backed by an
Obsidian vault. Install once on any machine and it works in **every** project you open.

- **Live communication** — native *agent teams* (a lead spawns peer teammates that talk to each
  other via `SendMessage` and share a task list). Plain subagents can't talk to each other.
- **Persistent memory** — agent teams have **no shared memory and no session resume**; when a
  teammate ends, its context is gone. A central Obsidian vault is what survives.

---

## ⚙️ Setup (any PC, ~2 min)

**1. Get the project**
```bash
git clone https://github.com/MatheusChiodi/AgentTeam-Memory.git
cd AgentTeam-Memory
```

**2. Open Claude Code in the folder**
```bash
claude
```

**3. Run the configuration command** — either way works:

| Inside Claude Code | Plain terminal |
| --- | --- |
| type `/setup` | `node install.mjs` |
| or `!node install.mjs` | `node install.mjs --vault D:/MyVault` |

That's it. Open a terminal in **any** project, run `claude`, and agent teams + memory are live.

> Requirements: **Claude Code ≥ 2.1.32**, **Node ≥ 18**. Nothing else — the scripts have zero dependencies.

---

## What the setup does

It promotes the system to the **user scope** (`~/.claude`), so it's global and machine-portable:

- enables agent teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) and `teammateMode: in-process`;
- installs 4 reusable roles into `~/.claude/agents/`: **researcher · executor · reviewer · librarian**;
- registers 2 memory hooks (`TaskCompleted`, `TeammateIdle`) — **opt-in & fail-open**;
- injects the **Memory Protocol** into `~/.claude/CLAUDE.md`;
- creates the central vault (default `~/.claude/memory-vault`) partitioned **per project**.

Your existing `~/.claude/settings.json` is **merged, not overwritten** (a timestamped `.bak` is kept).

---

## Daily use

```bash
# in any project folder:
claude
# ask the lead, e.g.:
#   "Create an agent team named memory-team with researcher, executor, reviewer and librarian.
#    Read the vault first, talk via SendMessage, log decisions, and have the librarian index at the end."
```

Memory CLI (`~/.claude/memory-team/memory.mjs`) — **25 commands**. Run `node memory.mjs help`
for the live list; `--json` works on every read command for scripting.

**Core**

| Command | Purpose |
| --- | --- |
| `where` | show vault path, detected project, enabled status and note count |
| `enable` | opt-in: make the `TaskCompleted`/`TeammateIdle` hooks enforce memory in this project |
| `search <term\|tag> [--all] [--json]` | rank notes for a term/tag (current project + global; `--all` = every project) |
| `save <type> "<title>" [--agent n --summary "..." --tags "a,b" --task id --from n --to n --global]` | write an atomic note (`memory\|decision\|learning\|communication\|state`) |
| `index [--all]` | regenerate the per-project `_index.md` and the master index |

**Navigation & reading**

| Command | Purpose |
| --- | --- |
| `list [--type t] [--tag x] [--agent a] [--project p] [--since YYYY-MM-DD] [--limit n] [--archived] [--all] [--json]` | list notes with filters |
| `show <ref> [--json]` | print a note resolved by reference (basename / slug / substring) |
| `recent [n] [--all] [--json]` | show the N most recent notes (default 10) |

**Tags**

| Command | Purpose |
| --- | --- |
| `tags [--all] [--json]` | show tag frequency across the project (`--all` = every project) |
| `tag <ref> [--add "a,b"] [--remove "c,d"] [--json]` | add/remove tags on one note |
| `retag <old> <new> [--all] [--json]` | rename a tag across all notes (old → new) |

**Knowledge graph (wikilinks)**

| Command | Purpose |
| --- | --- |
| `backlinks <ref> [--all] [--json]` | list notes that link to the target note |
| `links <ref> [--all] [--json]` | list outgoing wikilinks of a note (resolved vs dangling) |
| `graph [--all] [--json]` | render the wikilink graph as Mermaid (resolved edges only) |
| `orphans [--all] [--json]` | list notes with no inbound and no outbound links |

**Analytics**

| Command | Purpose |
| --- | --- |
| `stats [--all] [--json]` | aggregate vault stats: totals, byType/byAgent/byProject, top tags, oldest/newest |
| `timeline [--since YYYY-MM-DD] [--limit n] [--all] [--json]` | notes grouped by creation day (newest first) |

**Validation & cleanup**

| Command | Purpose |
| --- | --- |
| `validate [--all] [--json]` | lint note frontmatter (type/summary/created/agent); exits 1 on any problem |
| `dedupe [--all] [--json]` | report suspected duplicate notes (same title slug or identical summary) |
| `prune [--apply] [--all] [--json]` | find empty/placeholder notes; `--apply` archives them (dry-run by default) |

**Lifecycle**

| Command | Purpose |
| --- | --- |
| `archive <ref> [--restore]` | archive a note (move to `_archive`); `--restore` moves it back to `memory/` |
| `move <ref> <targetProject>` | move a note to another project's equivalent folder and update `fm.project` |
| `rename <ref> <new title...>` | rename a note (new title → new slug, keeping any date prefix) and update its heading |

**Backup & portability**

| Command | Purpose |
| --- | --- |
| `export [--format json\|md] [--out file] [--all]` | export notes as JSON (default) or concatenated Markdown; `--out` writes to a file |
| `import <file> [--project p]` | import notes from a JSON bundle (from `export`) into a project `memory/` folder |

Open the vault folder in **Obsidian** to browse the memory (wikilinks + `_index.md` as MOC).

See **[START.md](START.md)** for the full operating guide and ready-to-paste lead prompts.

---

## How it fits together

```
Team Lead (orchestrator)
  ├── spawns reusable roles (~/.claude/agents/*.md)
  ├── distributes work through the shared task list
  └── the librarian consolidates + indexes the vault at the end
Teammates (peers)
  ├── talk directly via the mailbox (SendMessage)
  ├── READ relevant memory BEFORE acting
  └── WRITE/UPDATE memory AFTER each deliverable
Central Obsidian vault = shared, persistent, versionable memory (partitioned per project)
```

## Layout (source of truth)

```
install.mjs                 # promotes everything to ~/.claude + creates the central vault
.claude/commands/setup.md   # the /setup slash command
memory-team/
  lib.mjs                   # low-level helpers (vault/project resolution, frontmatter, walk)
  notes.mjs                 # data layer (collect/resolve/format notes, wikilinks, tag histogram)
  memory.mjs                # thin dispatcher: argv → command, render lines/data/exit
  commands/                 # one file per command (registry auto-discovers; 25 commands)
  CLAUDE.md                 # Memory Protocol (injected into ~/.claude/CLAUDE.md)
  agents/                   # researcher · executor · reviewer · librarian
  hooks/                    # task-completed.mjs · teammate-idle.mjs (opt-in, fail-open)
  test/                     # node:test suite (temp real vault, no mocks)
docs/                       # ARCHITECTURE.md · USER-STORIES.md · system-guide.excalidraw
tools/build-guide.mjs       # regenerates docs/system-guide.excalidraw
START.md                    # install + day-to-day operation + lead prompts
```

## Uninstall / change vault

Re-run `node install.mjs --vault <newdir>` to point at a different vault. To remove, delete
`~/.claude/memory-team`, the 4 files in `~/.claude/agents/`, the `memory-team` block in
`~/.claude/CLAUDE.md`, and the hook/env entries in `~/.claude/settings.json` (restore the `.bak`).

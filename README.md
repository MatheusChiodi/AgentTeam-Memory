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

Memory CLI (`~/.claude/memory-team/memory.mjs`):

| Command | Purpose |
| --- | --- |
| `where` | show vault path, detected project, enabled status |
| `enable` | opt-in: make the hooks enforce memory in this project |
| `search <term> [--all]` | find notes (current project + global; `--all` = every project) |
| `save <type> "<title>" …` | write an atomic note (auto-filed under the current project) |
| `index [--all]` | regenerate the project `_index.md` (and the master index) |

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
  lib.mjs                   # shared helpers (vault/project resolution, frontmatter, walk)
  memory.mjs                # memory CLI (central, per-project)
  CLAUDE.md                 # Memory Protocol (injected into ~/.claude/CLAUDE.md)
  agents/                   # researcher · executor · reviewer · librarian
  hooks/                    # task-completed.mjs · teammate-idle.mjs (opt-in, fail-open)
START.md                    # install + day-to-day operation + lead prompts
```

## Uninstall / change vault

Re-run `node install.mjs --vault <newdir>` to point at a different vault. To remove, delete
`~/.claude/memory-team`, the 4 files in `~/.claude/agents/`, the `memory-team` block in
`~/.claude/CLAUDE.md`, and the hook/env entries in `~/.claude/settings.json` (restore the `.bak`).

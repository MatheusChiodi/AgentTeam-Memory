---
description: Install the memory-team system into ~/.claude (agent teams + central memory vault)
argument-hint: [--vault <dir>]
allowed-tools: Bash(node:*), AskUserQuestion
---
Install (or re-install) the memory-team system into the USER scope (`~/.claude`).

First decide WHERE the central vault lives — this is the only thing that survives across
agent-team sessions, so the user should pick it deliberately:

1. If `$ARGUMENTS` already contains `--vault`, skip the question and use it.
2. Otherwise find the current vault: `node install.mjs --print-vault` prints the path the
   cascade would use (an explicit prior choice from `settings.env.MEMORY_VAULT`, else the
   default `~/.claude/memory-vault`). Then ask with **AskUserQuestion**:
   - **Keep `<current>`** — re-setup without moving the vault (recommended; preserves notes).
   - **Other location** — let the user type an absolute path; the installer will COPY the
     existing notes into it non-destructively and keep the old vault intact.

Then run the installer with the chosen vault (omit `--vault` to keep the current one):

Execute: `node install.mjs $ARGUMENTS` (append `--vault "<chosen>"` only if the user picked a new location)

This promotes memory-team to `~/.claude`: enables agent teams, installs the four agent roles
(researcher, executor, reviewer, librarian), publishes all CLI commands as `/memory:<cmd>`,
registers the memory hooks + status line, injects the Memory Protocol into `~/.claude/CLAUDE.md`,
and scaffolds the central vault.

Re-running `/setup` never resets a custom vault location: the path is recovered from
`settings.env.MEMORY_VAULT`. Choosing a new location migrates the notes (copy, non-destructive).

After it runs, summarize what changed (vault path, settings.json keys, agents, hooks) and tell me
the next step: open `claude` in any project and ask the lead to bring up a team.

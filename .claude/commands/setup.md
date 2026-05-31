---
description: Install the memory-team system into ~/.claude (agent teams + central memory vault)
argument-hint: [--vault <dir>]
allowed-tools: Bash(node:*)
---
Run the project installer and report the result.

Execute: `node install.mjs $ARGUMENTS`

This promotes the memory-team system to the USER scope (`~/.claude`) so it works in every
project on this machine: it enables agent teams, installs the four agent roles
(researcher, executor, reviewer, librarian), registers the two memory hooks, injects the
Memory Protocol into `~/.claude/CLAUDE.md`, and creates the central vault
(default `~/.claude/memory-vault`, override with `--vault <dir>`).

After it runs, summarize what changed (settings.json keys, agents, hooks, vault path) and
tell me the next step: open `claude` in any project and ask the lead to bring up a team.

---
description: Automatic daily standup — what each agent produced in the window, from the vault
argument-hint: [--since YYYY-MM-DD]
allowed-tools: Bash(node:*)
---
You are the **lead** of the memory-team. Run the cross-agent standup from memory, without asking
anyone:

Run: `node memory-team/memory.mjs standup $ARGUMENTS`

This groups the window's notes (`--since`, default today) by agent: deliverables, count, and last
known state. Reply tersely — just the standup board, without restating what the tool already printed.
When installed globally, use `~/.claude/memory-team/memory.mjs`.

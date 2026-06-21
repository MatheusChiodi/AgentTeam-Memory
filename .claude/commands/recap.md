---
description: Ultra-compact recap of the window (decisions, deliverables, states) spending minimal tokens
argument-hint: [--since YYYY-MM-DD] [--max N]
allowed-tools: Bash(node:*)
---
You are the **lead** picking the context back up. Instead of re-reading note by note (token-expensive),
use the dense recap:

Run: `node memory-team/memory.mjs recap $ARGUMENTS`

Dense bullets grouped by type, prioritizing `decision`/`state` over `communication`, capped at `--max`
(default 12). It's the cheap counterpart to `digest` (which is verbose). Reply with just the recap.
When installed globally, use `~/.claude/memory-team/memory.mjs`.

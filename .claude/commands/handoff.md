---
description: Generate the handoff packet (state, open items, pins, decisions) for the next session/agent
argument-hint: [--save]
allowed-tools: Bash(node:*)
---
You are a **teammate** of the memory-team ending the turn. Agent teams have no resume — the handoff
IS the continuity. Before you go, generate the handoff packet from the vault:

Run: `node memory-team/memory.mjs handoff ${ARGUMENTS:---save}`

This gathers: the latest `state` per agent, open checkboxes, pinned notes (pins) and recent decisions
into a cohesive Markdown ready to paste at the start of the next session. With `--save` it becomes a
`memory` note (tag `handoff`) with wikilinks to the sources. Reply with just the packet + where the
note landed. When installed globally, use `~/.claude/memory-team/memory.mjs`.

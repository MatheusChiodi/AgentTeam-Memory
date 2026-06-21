---
description: Fan-out agents to explore a topic and materialize a Mermaid mindmap centered on a note or tag via the `mindmap` tool
argument-hint: <ref> | --tag <t> [--depth N]
allowed-tools: Bash(node:*), Task, Read, Glob, Grep
---
You are the **lead** of the memory-team. The user wants to explore a topic as a mindmap.

1. **Read the vault**: `node memory-team/memory.mjs search "$ARGUMENTS"` to locate the root note/tag.
2. **Light fan-out**: spawn 1–2 agents to map the topic's relevant neighbors (notes linked by
   `[[wikilink]]` and by shared tags) and suggest missing branches — each returns only note names,
   no prose.
3. **Materialize** with the engine: `node memory-team/memory.mjs mindmap $ARGUMENTS --save`
   (accepts a note `<ref>` or `--tag <t>`, plus `--depth N`). Writes a `memory` note (tag `mindmap`).
4. **Reply** tersely: the result + `memory/<slug>`. No recap.

When installed globally, use `~/.claude/memory-team/memory.mjs`.

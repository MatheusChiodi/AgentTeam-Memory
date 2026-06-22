---
description: Create a structured plan note (goal, steps, risks, done-when) in the vault
argument-hint: "<goal> [--steps a;b;c]"
allowed-tools: Bash(node:*)
---
You are a **teammate** kicking off a task. Standardize the start by creating the plan note:

Run: `node memory-team/memory.mjs plan $ARGUMENTS`

It generates a `memory` note (tag `plan`) with the sections `## Goal`, `## Steps` (each `--steps` item
becomes a `- [ ]` checkbox), `## Risks` and `## Done when`. Reply with just the name/path of the
created note — the content is already in the vault. When installed globally, use
`~/.claude/memory-team/memory.mjs`.

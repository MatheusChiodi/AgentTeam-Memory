---
description: Fan-out agents to architect a Mermaid diagram of the whole system and materialize it via the `diagram` tool
argument-hint: [--scope links|tags|agents|types]
allowed-tools: Bash(node:*), Task, Read, Glob, Grep
---
You are the **lead** of the memory-team. The user wants a diagram of the whole system. Orchestrate;
don't draw it alone:

1. **Read the vault** first: `node memory-team/memory.mjs search diagram` and
   `node memory-team/memory.mjs where` to locate the project and note count.
2. **Fan-out**: spawn agents in parallel (Task), each architecting one slice of the system — e.g.
   (a) code layers/modules, (b) data flow between components, (c) the vault's memory graph. Each agent
   returns nodes + edges for its slice (structured text, no prose).
3. **Reviewer consolidates**: a `reviewer` agent cross-checks the slices, removes duplicate/phantom
   nodes and resolves contradictions into a single coherent set of nodes/edges.
4. **Materialize** with the deterministic engine (don't hand-write Mermaid):
   `node memory-team/memory.mjs diagram --scope ${ARGUMENTS:-links} --save`.
   `--save` writes the `memory` note (tag `diagram`) with the ```mermaid``` block into the vault.
5. **Reply** following the protocol's output discipline: just the result + where the note landed
   (`memory/<slug>`). The diagram speaks for itself — no recap.

When installed globally, replace `memory-team/memory.mjs` with `~/.claude/memory-team/memory.mjs`.

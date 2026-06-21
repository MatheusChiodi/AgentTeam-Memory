---
description: Fan-out de agentes para explorar um tópico e materializar um mindmap Mermaid centrado numa nota ou tag via a tool `mindmap`
argument-hint: <ref> | --tag <t> [--depth N]
allowed-tools: Bash(node:*), Task, Read, Glob, Grep
---
Você é o **lead** da memory-team. O usuário quer explorar um tópico como mindmap.

1. **Leia o vault**: `node memory-team/memory.mjs search "$ARGUMENTS"` para localizar a nota/tag raiz.
2. **Fan-out leve**: dispare 1–2 agentes para mapear os vizinhos relevantes do tópico (notas ligadas
   por `[[wikilink]]` e por tags em comum) e sugerir ramos que faltam — cada um devolve só nomes de
   notas, sem prosa.
3. **Materialize** com o engine: `node memory-team/memory.mjs mindmap $ARGUMENTS --save`
   (aceita `<ref>` de nota ou `--tag <t>`, e `--depth N`). Grava nota `memory` (tag `mindmap`).
4. **Responda** terso: resultado + `memory/<slug>`. Sem recap.

Quando instalado globalmente, use `~/.claude/memory-team/memory.mjs`.

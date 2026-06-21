---
description: Cria uma nota de plano estruturada (objetivo, passos, riscos, critério de pronto) no vault
argument-hint: "<objetivo>" [--steps "a;b;c"]
allowed-tools: Bash(node:*)
---
Você é um **teammate** arrancando uma tarefa. Padronize o início criando a nota de plano:

Execute: `node memory-team/memory.mjs plan $ARGUMENTS`

Gera uma nota `memory` (tag `plan`) já com as seções `## Objetivo`, `## Passos` (cada `--steps` vira
checkbox `- [ ]`), `## Riscos` e `## Pronto quando`. Responda só com o nome/caminho da nota criada —
o conteúdo já está no vault. Quando instalado globalmente, use `~/.claude/memory-team/memory.mjs`.

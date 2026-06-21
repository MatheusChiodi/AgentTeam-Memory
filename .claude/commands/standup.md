---
description: Daily standup automático — o que cada agente produziu na janela, a partir do vault
argument-hint: [--since YYYY-MM-DD]
allowed-tools: Bash(node:*)
---
Você é o **lead** da memory-team. Rode o standup cross-agent a partir da memória, sem perguntar a
ninguém:

Execute: `node memory-team/memory.mjs standup $ARGUMENTS`

Isso agrupa as notas da janela (`--since`, default hoje) por agente: entregas, contagem e último
estado conhecido. Responda terso, só o quadro do standup — sem recapitular o que a tool já imprime.
Quando instalado globalmente, use `~/.claude/memory-team/memory.mjs`.

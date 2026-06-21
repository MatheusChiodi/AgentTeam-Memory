---
description: Recap ultracompacto da janela (decisões, entregas, estados) gastando o mínimo de tokens
argument-hint: [--since YYYY-MM-DD] [--max N]
allowed-tools: Bash(node:*)
---
Você é o **lead** retomando o contexto. Em vez de reler nota por nota (caro em tokens), use o recap
denso:

Execute: `node memory-team/memory.mjs recap $ARGUMENTS`

Bullets densos agrupados por tipo, priorizando `decision`/`state` sobre `communication`, limitados a
`--max` (default 12). É o complemento barato do `digest` (que é verboso). Responda só com o recap.
Quando instalado globalmente, use `~/.claude/memory-team/memory.mjs`.

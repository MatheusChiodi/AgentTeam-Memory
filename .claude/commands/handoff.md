---
description: Gera o pacote de passagem (estado, itens abertos, pins, decisões) para a próxima sessão/agente
argument-hint: [--save]
allowed-tools: Bash(node:*)
---
Você é um **teammate** da memory-team encerrando o turno. Agent teams não têm resume — o handoff É a
continuidade. Antes de ir, gere o pacote de passagem a partir do vault:

Execute: `node memory-team/memory.mjs handoff ${ARGUMENTS:---save}`

Isso reúne: último `state` por agente, checkboxes abertos, notas fixadas (pins) e decisões recentes,
em um markdown coeso pronto para colar no início da próxima sessão. Com `--save` ele vira uma nota
`memory` (tag `handoff`) com wikilinks para as fontes. Responda só com o pacote + onde a nota caiu.
Quando instalado globalmente, use `~/.claude/memory-team/memory.mjs`.

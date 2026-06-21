---
description: Fan-out de agentes para arquitetar um diagrama Mermaid do sistema inteiro e materializá-lo via a tool `diagram`
argument-hint: [--scope links|tags|agents|types]
allowed-tools: Bash(node:*), Task, Read, Glob, Grep
---
Você é o **lead** da memory-team. O usuário quer um diagrama do sistema inteiro. Orquestre,
não desenhe sozinho:

1. **Leia o vault** antes de tudo: `node memory-team/memory.mjs search diagram` e
   `node memory-team/memory.mjs where` para situar projeto e nº de notas.
2. **Fan-out**: dispare agentes em paralelo (Task), cada um arquitetando um recorte do sistema —
   por exemplo: (a) camadas/módulos do código, (b) fluxo de dados entre componentes, (c) o grafo
   de memória do vault. Cada agente devolve nós + arestas do seu recorte (texto estruturado, sem
   prosa).
3. **Reviewer consolida**: um agente `reviewer` cruza os recortes, remove nós duplicados/fantasma e
   resolve contradições, produzindo um único conjunto coeso de nós/arestas.
4. **Materialize** com o engine determinístico (não invente Mermaid à mão):
   `node memory-team/memory.mjs diagram --scope ${ARGUMENTS:-links} --save`.
   O `--save` grava a nota `memory` (tag `diagram`) com o bloco ```mermaid``` no vault.
5. **Responda** seguindo a disciplina de output do protocolo: só o resultado + onde a nota caiu
   (`memory/<slug>`). O diagrama fala por si — sem recapitulação.

Quando instalado globalmente, troque `memory-team/memory.mjs` por `~/.claude/memory-team/memory.mjs`.

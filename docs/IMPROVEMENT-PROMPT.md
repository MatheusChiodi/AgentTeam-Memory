# Prompt multi-agente — melhoria contínua do AgentTeam-Memory

Este arquivo contém **prompts prontos para colar no lead** (no `claude`, dentro deste repositório)
que sobem um agent-team `memory-team` para **melhorar o projeto de ponta a ponta**, respeitando
as regras invioláveis do repo:

1. **Toda mudança vive numa branch nova** (`feature/<slug>`), e **cada fase concluída faz `git push`**.
2. **Tudo que entra tem teste unitário** (`node:test`, vault temporário, sem mocks) — suíte verde.
3. **Tudo que entra é documentado** (README/START/ARCHITECTURE/USER-STORIES + `system-guide.excalidraw`).
4. **Protocolo memory-team**: cada teammate LÊ a memória antes de agir e ESCREVE uma nota atômica
   por entrega (`save <type> … --task <id>`), comunica via `SendMessage` e dá flush de estado antes de ociar.

> O time opera em inglês; as explicações aqui estão em PT-BR (padrão dos demais arquivos de `docs/`).

---

## 0. Pré-requisitos (uma vez por máquina/projeto)

```bash
# memory-team instalado no escopo do usuário (~/.claude):
node install.mjs
# enforcement de memória ligado NESTE projeto:
node "C:/Users/mathe/.claude/memory-team/memory.mjs" enable
# dependências de teste: nenhuma (zero-dependency). Sanidade:
npm test
```

---

## 1. Prompt mestre — subir o time e abrir a branch

Cole no lead. Troque `<OBJETIVO>` pelo tema da rodada (ex.: "endurecer a validação do vault" ou
"adicionar suporte a anexos nas notas").

> Create an agent team named `memory-team` with `researcher`, `executor`, `reviewer` and `librarian`.
> Goal: **<OBJETIVO>**. Working dir is this repo (`AgentTeam-Memory`).
>
> Hard rules for the whole run:
> 1. Create a new branch `feature/<slug-of-objective>` before any change. **Push at the end of every phase.**
> 2. Every new command/feature ships with a `node:test` file under `memory-team/test/` and the full suite (`npm test`) must stay green.
> 3. Every new command/feature is documented: update `README.md`, `docs/ARCHITECTURE.md`, `docs/USER-STORIES.md` and regenerate `docs/system-guide.excalidraw` (`node tools/build-guide.mjs`).
> 4. Follow the memory protocol: each teammate runs `search` + reads `_index.md` and its state note BEFORE acting, and `save`s one atomic note per deliverable citing `--task <id>`; log peer messages on the board; flush state before going idle. The `librarian` runs `index` at the end.
>
> Phase plan (push after each):
> - **Phase 1 — Understand**: `researcher` maps the relevant code (`memory-team/{lib,notes,memory}.mjs`, `commands/`, `hooks/`) and the vault, then writes/updates `docs/ARCHITECTURE.md` notes for the area of `<OBJETIVO>`. `reviewer` validates the plan adversarially.
> - **Phase 2 — Implement**: `executor` builds `<OBJETIVO>` as one or more `commands/<name>.mjs` (contract `{ name, summary, usage, run(ctx) }`, no `console.log`/`process.exit`, use `notes.mjs` helpers) **plus tests**.
> - **Phase 3 — Verify**: `reviewer` runs `npm test`, attacks edge cases (Windows paths, empty vault, ambiguous refs, `--json`), and confirms the 5 original commands still pass.
> - **Phase 4 — Document & index**: `executor`/`librarian` update the docs and regenerate the guide; `librarian` consolidates notes and runs `index`.
>
> Report a 5-line summary per phase and the commit hash you pushed.

---

## 2. Variações de objetivo (rodadas temáticas)

Cada bullet é um `<OBJETIVO>` plug-and-play para o prompt mestre:

- **Robustez**: "harden the CLI — add input validation, helpful error messages and exit codes to every command; add tests for malformed frontmatter and missing args."
- **Performance**: "cache the vault scan (`collectNotes`) within a single CLI invocation and benchmark `search`/`stats` on a 1k-note vault."
- **Nova capacidade — anexos**: "support attachments: a `attach <ref> <file>` command that copies a file next to a note and links it in the frontmatter, with `detach` and tests."
- **Nova capacidade — busca avançada**: "extend `search` with boolean operators (`tag:`, `type:`, `agent:`, `--since`) and a relevance explanation; keep backward compatibility and tests."
- **Integração**: "add a `serve` command exposing the read commands over a tiny zero-dependency HTTP JSON API for dashboards."
- **Qualidade do vault**: "add a `lint --fix` mode that normalizes frontmatter order, dedupes tags and repairs broken wikilinks, all behind a dry-run by default."
- **Observabilidade**: "add a `log` command that appends structured audit entries and a `report` command that summarizes activity per agent/day."

---

## 3. Contrato técnico que os agentes DEVEM respeitar

Resumo do que está em `docs/ARCHITECTURE.md` — cole junto se o agente não tiver lido ainda:

```text
- Novo comando = novo arquivo memory-team/commands/<name>.mjs. O registry faz auto-discovery
  (varre a pasta), então NÃO se edita memory.mjs/registry.mjs/_ctx.mjs/lib.mjs.
- export default { name, summary, usage, run(ctx) }
  ctx = { ROOT, PROJECT, pos, opt, json, all }
  run retorna { ok, code?, lines?, data? }  — nunca console.log/process.exit
  lines = saída humana; data = saída estruturada (impressa como JSON quando --json)
- Data layer: memory-team/notes.mjs (collectNotes, resolveNotes, readNote, formatNote,
  wikilinksOf, tagHistogram, relOf, isArchived). Helpers de path/frontmatter: lib.mjs.
- Teste: memory-team/test/<name>.test.mjs com node:test + _helpers.mjs
  (makeVault, cleanup, run, runCli, seedNote). Vault temporário real, sem mocks.
- install.mjs copia lib.mjs, notes.mjs, memory.mjs, commands/ e hooks/ — se criar uma
  pasta nova de runtime, atualize install.mjs.
```

---

## 4. Definition of Done (gate de cada fase)

Uma fase só fecha quando **todos** os itens abaixo são verdade — é o checklist que o `reviewer` aplica:

- [ ] `npm test` verde (inclusive os 5 comandos originais e o smoke test).
- [ ] Cada comando/feature novo tem arquivo de teste dedicado cobrindo caso feliz + ≥2 edge cases.
- [ ] `node memory-team/memory.mjs help` lista o novo comando com `usage`/`summary` corretos.
- [ ] `--json` retorna `data` estruturado para todo comando de leitura.
- [ ] Docs atualizados: README (tabela), ARCHITECTURE, USER-STORIES e `system-guide.excalidraw` regenerado.
- [ ] Uma nota atômica por entrega no vault, citando `--task <id>`, com `summary` no frontmatter.
- [ ] `librarian` rodou `index` (per-project `_index.md` + master atualizado).
- [ ] Commit em PT imperativo curto + **`git push`** da fase.

---

## 5. Encerramento

> We're done. Every teammate flushes its state note, the `librarian` runs `index`, you give me a
> 5-line summary of what shipped per phase with each pushed commit hash, then gracefully shut down
> the team (SendMessage `shutdown_request` to each teammate).

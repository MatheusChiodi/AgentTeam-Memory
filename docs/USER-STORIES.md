# AgentTeam-Memory — User Stories

> Especificação formal da expansão do CLI. Cada história segue o formato US-XXX com
> **Critérios de aceite** verificáveis e a **tool/feature** relacionada. Estes critérios
> guiam os executores (o que implementar) e o reviewer (o que cobrar).
>
> Referência de arquitetura: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Personas

| Persona | Papel |
| --- | --- |
| **Lead** | Orquestrador do agent team. Distribui tarefas, lê relatórios do vault, decide o que arquivar/limpar. |
| **Teammate** | Agente executor (researcher, executor, reviewer). LÊ memória antes de agir, ESCREVE nota após cada entrega. |
| **Librarian** | Curador do vault. Mantém taxonomia de tags, grafo coerente, índices, arquiva e limpa. Único que roda `index`. |
| **Mantenedor** | Dono do projeto AgentTeam-Memory. Garante portabilidade, integridade e qualidade do próprio CLI. |

## Convenção

`<ref>` = referência frouxa a uma nota (basename exato → fragmento de slug → substring de
nome/summary), resolvida por `resolveNotes`. Toda tool de leitura aceita `--json` e, nesse modo,
emite **apenas** `res.data`.

---

## F0 — Base (Fase 0, já entregue)

> Comandos pré-existentes do CLI; incluídos para fechar a cobertura do contrato.

### US-001 — Localizar o vault e o estado do projeto
**Como** teammate **quero** rodar `where` **para** saber qual vault e projeto estou usando e se o enforcement está ativo, antes de começar.
- **Tool:** `where` · **Feature:** F0
- **Aceite:**
  - Imprime vault root, projeto detectado, diretório do projeto, status `enabled`, contagem de notas e lista de projetos.
  - `enabled` reflete a existência do marcador `.memory-team` no cwd.
  - Popula `data` com `{ vaultRoot, project, projectDir, enabled, notes, projects }`.

### US-002 — Ativar o enforcement de memória num projeto
**Como** lead **quero** rodar `enable` uma vez na raiz do projeto **para** que os hooks passem a exigir notas de memória ali.
- **Tool:** `enable` · **Feature:** F0
- **Aceite:**
  - Escreve o marcador `.memory-team` (se ausente) e garante a partição `projects/<proj>/`.
  - É idempotente: rodar de novo não duplica nem sobrescreve.
  - A partir daí `where` reporta `enabled: yes`.

### US-003 — Buscar conhecimento antes de agir
**Como** teammate **quero** rodar `search <term>` **para** reaproveitar o que o time já sabe e não retrabalhar.
- **Tool:** `search` · **Feature:** F0
- **Aceite:**
  - Rankeia notas do projeto atual + global (`--all` = todos os projetos) por relevância (tag > summary > nome > tipo > agente > corpo).
  - `--json` retorna a lista ordenada com `{ name, type, project, agent, summary, tags, file, score }`.
  - Termo sem matches retorna mensagem clara e `data` vazio (não erro).

### US-004 — Registrar uma nota atômica após uma entrega
**Como** teammate **quero** rodar `save <type> "<título>"` **para** persistir o resultado da minha tarefa no vault.
- **Tool:** `save` · **Feature:** F0
- **Aceite:**
  - `type` inválido ou título vazio → erro de usage (exit 1), sem escrever arquivo.
  - Arquiva no destino correto por tipo (memory/board/agents) com naming por data/slug; colisão gera sufixo `-2`, `-3`…
  - `state` é idempotente (não sobrescreve nota existente); `--global` envia para `global/`.
  - Frontmatter contém `type/project/agent/summary/tags/related/task/created` na ordem canônica.

### US-005 — Regenerar os índices do vault
**Como** librarian **quero** rodar `index` **para** manter o `_index.md` do projeto e o mestre coerentes.
- **Tool:** `index` · **Feature:** F0
- **Aceite:**
  - Regenera `projects/<proj>/_index.md` agrupado por tipo e o `_index.md` mestre com contagem por projeto.
  - `--all` reindexação de todos os projetos.
  - Notas aparecem com wikilink, agente e summary.

---

## F1 — Arquitetura modular extensível

### US-006 — Adicionar uma tool sem conflito de merge
**Como** mantenedor **quero** registrar um novo comando soltando um arquivo em `commands/` **para** que múltiplos agentes adicionem tools em paralelo sem editar um registro central.
- **Tool:** infra (registry/dispatcher) · **Feature:** F1
- **Aceite:**
  - Um arquivo `commands/<nome>.mjs` que exporte `{ name, summary, usage, run }` é descoberto automaticamente no próximo invoke.
  - Arquivos iniciados por `_` e `registry.mjs` são ignorados.
  - O novo comando aparece no `help` com `usage`/`summary` alinhados.
  - Um módulo sem `name` ou sem `run` é silenciosamente ignorado (não quebra o load).

### US-007 — Obter ajuda consistente de qualquer comando
**Como** teammate **quero** rodar `help` (ou nenhum argumento) **para** ver todas as tools disponíveis e suas assinaturas.
- **Tool:** dispatcher · **Feature:** F1
- **Aceite:**
  - Sem comando, `help`, ou `--help` → lista todos os comandos ordenados, com tipos, vault e projeto no rodapé.
  - Comando desconhecido → stderr `unknown command: X` + help + exit 1.

---

## F2 — Navegação e leitura de notas

### US-008 — Listar e filtrar notas do vault
**Como** teammate **quero** rodar `list` com filtros **para** encontrar rapidamente as notas relevantes sem abrir o Obsidian.
- **Tool:** `list` · **Feature:** F2
- **Aceite:**
  - Suporta `--type`, `--tag`, `--agent`, `--project`, `--since YYYY-MM-DD`, `--limit n`, combináveis (AND).
  - Por padrão exclui notas em `_archive/`; `--archived` as inclui.
  - `--since` filtra por `created`/mtime ≥ data; `--limit` corta o total após ordenar (mais recentes primeiro).
  - `--json` retorna array de `{ name, type, project, agent, summary, tags, created, file, archived }`.
  - Sem matches → mensagem clara, `data: []`, exit 0.

### US-009 — Exibir o conteúdo de uma nota por referência frouxa
**Como** teammate **quero** rodar `show <ref>` **para** ler uma nota inteira identificando-a por título parcial.
- **Tool:** `show` · **Feature:** F2
- **Aceite:**
  - Resolve `<ref>` via `resolveNotes`; `<ref>` único → imprime frontmatter + corpo.
  - `<ref>` ambíguo → lista os candidatos e pede refino (não imprime um arbitrário).
  - `<ref>` inexistente → mensagem clara, exit 1.
  - `--json` retorna `{ name, fm, body, file, rel }`.

### US-010 — Ver as notas mais recentes
**Como** lead **quero** rodar `recent [n]` **para** revisar o que o time produziu por último.
- **Tool:** `recent` · **Feature:** F2
- **Aceite:**
  - Sem `n`, usa um default razoável (ex.: 10); `recent 25` mostra 25.
  - Ordena por data (created/mtime) decrescente.
  - `--json` retorna a lista com `{ name, type, agent, created, file }`.

---

## F3 — Gestão de taxonomia de tags

### US-011 — Inspecionar o vocabulário de tags
**Como** librarian **quero** rodar `tags` **para** ver todas as tags e suas frequências e detectar sinônimos/typos.
- **Tool:** `tags` · **Feature:** F3
- **Aceite:**
  - Lista um histograma `[tag, count]` ordenado por frequência (desempate alfabético).
  - `--all` agrega o vault inteiro; sem flag, projeto atual + global.
  - `--json` retorna `[{ tag, count }]`.

### US-012 — Adicionar/remover tags de uma nota
**Como** teammate **quero** rodar `tag <ref> --add "a,b" --remove "c"` **para** corrigir a taxonomia de uma nota.
- **Tool:** `tag` · **Feature:** F3
- **Aceite:**
  - Aplica add/remove (CSV) sobre a nota resolvida; reescreve via `formatNote` preservando os demais campos.
  - Não duplica tags já presentes; remover tag inexistente é no-op silencioso.
  - `<ref>` ambíguo/inexistente → mensagem clara, exit 1, sem escrever.
  - Reporta o conjunto final de tags.

### US-013 — Renomear uma tag em massa
**Como** librarian **quero** rodar `retag <old> <new>` **para** consolidar uma tag em todas as notas de uma vez.
- **Tool:** `retag` · **Feature:** F3
- **Aceite:**
  - Substitui `old` por `new` em toda nota que a contenha; `--all` = todos os projetos.
  - Notas sem `old` ficam intactas; se `new` já existe na nota, não duplica.
  - Reporta quantas notas foram alteradas; preserva o resto do frontmatter.

---

## F4 — Grafo de conhecimento (wikilinks)

### US-014 — Descobrir o que uma nota referencia
**Como** teammate **quero** rodar `links <ref>` **para** ver para quais notas esta aponta.
- **Tool:** `links` · **Feature:** F4
- **Aceite:**
  - Extrai wikilinks de `related` + corpo (`wikilinksOf`); resolve cada alvo a uma nota existente.
  - Marca links quebrados (alvo inexistente) distintamente.
  - `--json` retorna `{ source, links: [{ target, resolved }] }`.

### US-015 — Descobrir quem referencia uma nota
**Como** teammate **quero** rodar `backlinks <ref>` **para** ver quais notas dependem desta antes de mudá-la/arquivá-la.
- **Tool:** `backlinks` · **Feature:** F4
- **Aceite:**
  - Varre todas as notas e coleta as que linkam para `<ref>` (por nome/slug).
  - `<ref>` sem backlinks → lista vazia clara, exit 0.
  - `--json` retorna `{ target, backlinks: [name…] }`.

### US-016 — Visualizar o grafo de conhecimento
**Como** lead **quero** rodar `graph` **para** ver o mapa de conexões do vault como diagrama.
- **Tool:** `graph` · **Feature:** F4
- **Aceite:**
  - Emite um bloco **Mermaid** (`flowchart`/`graph`) com nós = notas e arestas = wikilinks.
  - Nós identificados pelo nome da nota; arestas direcionais (origem → alvo).
  - `--json` retorna `{ nodes: [...], edges: [{from,to}] }`.
  - Vault vazio → grafo vazio válido (não quebra).

### US-017 — Encontrar notas órfãs
**Como** librarian **quero** rodar `orphans` **para** achar notas sem nenhuma conexão e ligá-las ou arquivá-las.
- **Tool:** `orphans` · **Feature:** F4
- **Aceite:**
  - Lista notas sem links de saída **e** sem backlinks.
  - Notas de `state` podem ser tratadas à parte (não são conhecimento ligável) — decisão documentada na nota do executor.
  - `--json` retorna `[{ name, type, file }]`.

---

## F5 — Analytics e relatórios do vault

### US-018 — Ver estatísticas do vault
**Como** lead **quero** rodar `stats` **para** ter um panorama do volume e composição da memória.
- **Tool:** `stats` · **Feature:** F5
- **Aceite:**
  - Agrega contagens por tipo, por agente, por projeto e por tag; total de notas e de órfãs.
  - `--all` = vault inteiro; sem flag, projeto atual + global.
  - `--json` retorna o objeto agregado completo.

### US-019 — Ver a linha do tempo de atividade
**Como** lead **quero** rodar `timeline --since 2026-06-01` **para** auditar o que o time produziu numa janela.
- **Tool:** `timeline` · **Feature:** F5
- **Aceite:**
  - Lista notas agrupadas/ordenadas por data; `--since` filtra a partir de uma data; `--limit` corta o total.
  - Cada entrada mostra data, tipo, agente e título.
  - `--json` retorna `[{ date, name, type, agent }]`.

---

## F6 — Validação / lint do vault

### US-020 — Validar a integridade do vault
**Como** mantenedor **quero** rodar `validate` **para** detectar notas com frontmatter quebrado ou links mortos antes de confiar no vault.
- **Tool:** `validate` · **Feature:** F6
- **Aceite:**
  - Reporta: `type` ausente/ inválido, `summary` ausente, wikilinks apontando para notas inexistentes, tags malformadas.
  - **Exit code 1** quando há ao menos um erro; exit 0 quando limpo.
  - `--all` valida todos os projetos; `--json` retorna `{ ok, errors: [{ file, rule, detail }] }`.
  - Roda como gate em CI/hook (o exit code é o contrato).

---

## F7 — Detecção de duplicatas e limpeza

### US-021 — Detectar notas duplicadas
**Como** librarian **quero** rodar `dedupe` **para** achar notas quase-idênticas e consolidá-las.
- **Tool:** `dedupe` · **Feature:** F7
- **Aceite:**
  - Agrupa notas por similaridade (mesmo slug/título, summary igual, ou corpo muito similar) e reporta os grupos.
  - Não apaga nada (só reporta); indica qual manter como sugestão.
  - `--json` retorna `[{ group: [name…], reason }]`.

### US-022 — Limpar ruído do vault com segurança
**Como** librarian **quero** rodar `prune` **para** remover notas vazias/órfãs antigas, mas só depois de revisar o que será apagado.
- **Tool:** `prune` · **Feature:** F7
- **Aceite:**
  - **Dry-run por padrão**: lista o que seria removido sem tocar no disco.
  - `--apply` é obrigatório para apagar de fato.
  - Critérios explícitos (ex.: corpo vazio, órfã + antiga); nunca remove `state` ou notas linkadas.
  - `--json` retorna `{ wouldRemove: [...], applied: bool }`.

---

## F8 — Ciclo de vida de notas

### US-023 — Arquivar e restaurar uma nota
**Como** librarian **quero** rodar `archive <ref>` **para** tirar uma nota obsoleta das buscas sem perdê-la.
- **Tool:** `archive` · **Feature:** F8
- **Aceite:**
  - Move a nota para `_archive/` da mesma partição; `--restore` traz de volta.
  - Notas arquivadas saem de `search`/`list` por padrão (só com `--archived`).
  - `<ref>` ambíguo/inexistente → erro claro, exit 1, sem mover.

### US-024 — Mover uma nota entre projetos
**Como** lead **quero** rodar `move <ref> <targetProject>` **para** realocar conhecimento ao projeto correto.
- **Tool:** `move` · **Feature:** F8
- **Aceite:**
  - Move o arquivo para a partição de `targetProject` (criando-a se preciso) e atualiza `project:` no frontmatter.
  - Preserva conteúdo e demais campos via `formatNote`.
  - Reporta o caminho de origem e destino; `<ref>` inexistente → erro, exit 1.

### US-025 — Renomear o título de uma nota
**Como** teammate **quero** rodar `rename <ref> <novo titulo>` **para** corrigir o título e o nome do arquivo de uma nota.
- **Tool:** `rename` · **Feature:** F8
- **Aceite:**
  - Atualiza o `# título` no corpo e renomeia o arquivo para o novo slug (preservando o prefixo de data).
  - Não quebra `summary` nem outros campos; colisão de nome resolve com sufixo.
  - Backlinks que apontavam pelo nome antigo são reportados como potencialmente quebrados.

---

## F9 — Backup e portabilidade

### US-026 — Exportar o vault para backup/migração
**Como** mantenedor **quero** rodar `export` **para** levar a memória para outra máquina ou versioná-la fora do Obsidian.
- **Tool:** `export` · **Feature:** F9
- **Aceite:**
  - `--format json` produz um bundle único com todas as notas + frontmatter; `--format md` produz um agregado Markdown.
  - `--out file` grava em arquivo; sem `--out`, emite no stdout.
  - `--all` = vault inteiro; sem flag, projeto atual.
  - O export é reidratável por `import` (round-trip sem perda).

### US-027 — Importar notas de um backup
**Como** mantenedor **quero** rodar `import <file> --project p` **para** reidratar a memória num vault novo.
- **Tool:** `import` · **Feature:** F9
- **Aceite:**
  - Lê um bundle gerado por `export` e cria as notas em `--project` (ou no detectado).
  - Não sobrescreve notas existentes sem necessidade (resolve colisão com sufixo); reporta quantas importou.
  - Frontmatter preservado; arquivo inválido → erro claro, exit 1, nada escrito.

---

## F10 — Saída estruturada JSON (transversal)

### US-028 — Consumir saída programaticamente via `--json`
**Como** mantenedor **quero** que toda tool de leitura aceite `--json` **para** integrar o CLI a scripts, CI e outros agentes.
- **Tool:** todas as de leitura · **Feature:** F10
- **Aceite:**
  - Com `--json`, o dispatcher emite **apenas** `res.data` como JSON indentado (sem as `lines` humanas).
  - O `data` de cada tool de leitura espelha a informação mostrada em `lines`.
  - Saída JSON sempre parseável (testada com `JSON.parse`).

### US-029 — Encadear tools num pipeline
**Como** lead **quero** combinar tools com `--json` **para** automatizar fluxos (ex.: `orphans --json` → arquivar cada um).
- **Tool:** transversal · **Feature:** F10
- **Aceite:**
  - `orphans/list/search/stats` em `--json` produzem arrays/objetos consumíveis sem parsing de texto humano.
  - Exit codes são consistentes (0 sucesso, 1 erro/validação) para uso em `&&`/`||`.

---

## Integridade e qualidade (transversal)

### US-030 — Garantir que mutações não corrompem notas
**Como** mantenedor **quero** que toda tool que escreve preserve campos de frontmatter desconhecidos **para** que o vault sobreviva a evoluções de schema.
- **Tool:** `tag`, `retag`, `move`, `rename`, `archive`, `import` · **Feature:** F3/F8/F9
- **Aceite:**
  - Um round-trip (ler → mutar → reescrever) por `formatNote` mantém campos fora de `FM_ORDER` (apêndice ordenado).
  - Teste com vault temporário semeado (`seedNote`) confirma a preservação.

### US-031 — Não destruir dados sem confirmação explícita
**Como** lead **quero** que operações destrutivas exijam uma flag explícita **para** evitar perda acidental de memória.
- **Tool:** `prune` (`--apply`), `archive` (move, não apaga) · **Feature:** F7/F8
- **Aceite:**
  - `prune` sem `--apply` nunca toca o disco.
  - `archive` move para `_archive/` (recuperável), nunca deleta.
  - `<ref>` ambíguo em qualquer mutação aborta com erro em vez de adivinhar.

### US-032 — Toda tool nova vem com testes
**Como** mantenedor **quero** que cada tool tenha testes `node:test` com vault temporário **para** que a suíte fique verde e sem mocks.
- **Tool:** transversal (test harness) · **Feature:** F1
- **Aceite:**
  - Cada tool tem happy path in-process (`run`) + e2e via `runCli` quando o dispatcher importa.
  - Cobre `<ref>` inexistente/ambíguo, vault vazio e (quando aplicável) exit code e dry-run.
  - `npm test` passa inteiro.

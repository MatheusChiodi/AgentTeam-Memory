# AgentTeam-Memory — User Stories (Fase 3)

> Terceira onda de expansão: **experiência de quem faz vibe coding via terminal**. O vault deixa de
> ser só consultável/observável e passa a **trabalhar pelo dev**: destila memória em pacotes baratos
> de contexto (mais output do agente sem mais tokens), **visualiza o sistema** (diagramas, painel,
> árvore, sparklines) e entrega **comandos de fluxo diário** (plano, standup, handoff, recap, todo).
>
> Continua a numeração da [Fase 2](./USER-STORIES-PHASE-2.md): começa em **US-048** (a base vai até
> US-047) e em **F21** (a base vai até F20). Referência de arquitetura:
> [`ARCHITECTURE-PHASE-3.md`](./ARCHITECTURE-PHASE-3.md).

## Convenção (herdada das Fases 1/2)

`<ref>` = referência frouxa a uma nota (basename exato → fragmento de slug → substring de
nome/summary), resolvida por `resolveNotes`. Toda tool de leitura aceita `--json` e, nesse modo,
emite **apenas** `res.data`. Mutações reescrevem via `formatNote` preservando frontmatter desconhecido.
Toda tool é um arquivo em `commands/` (auto-discovery), contrato `{ name, summary, usage, run(ctx) }`
devolvendo `{ ok, code?, lines?, data? }`. **Zero dependência externa.**

## Princípios-guia desta fase

1. **Mais output do agente, mesmos tokens.** O trabalho pesado (ranking, resumo, contagem, render) é
   **local e heurístico** — não consome o LLM. Comandos como `brief`/`focus`/`recap` entregam ao agente
   um pacote já destilado, em vez de mandá-lo varrer o vault inteiro.
2. **Visual que explica o que está acontecendo.** Diagramas Mermaid, painel ANSI, árvore, sparklines e
   heatmaps tornam o estado do sistema legível de relance — no terminal e no Obsidian.
3. **Determinismo testável.** Nada de relógio/aleatório no caminho de render testado: datas vêm das
   notas, "agora" é injetável. Cada tool nova tem **≥ 5 testes** `node:test` sem mocks.

## Mapa da fase

| # | Feature | Tool | US | Cluster |
| --- | --- | --- | --- | --- |
| **F21** ⭐ | Diagrama Mermaid do sistema/grafo de notas | `diagram` | US-048 | Visual |
| **F22** | Painel de visão geral no terminal | `dashboard` | US-049 | Visual |
| **F23** | Árvore visual das notas | `tree` | US-050 | Visual |
| **F24** | Sparkline de atividade (notas/dia) | `activity` | US-051 | Visual |
| **F25** | Heatmap calendário de criação | `heatmap` | US-052 | Visual |
| **F26** | Context-pack budgetado para semear agente | `brief` | US-053 | Tokens |
| **F27** | Estimador de tokens de notas/texto | `tokens` | US-054 | Tokens |
| **F28** | Retrieval por orçamento de tokens | `focus` | US-055 | Tokens |
| **F29** | Resumo extrativo (TL;DR) de nota/conjunto | `tldr` | US-056 | Tokens |
| **F30** | Recap de sessão em tokens mínimos | `recap` | US-057 | Tokens |
| **F31** | Scaffold de nota de plano | `plan` | US-058 | Fluxo |
| **F32** | Standup cross-agent | `standup` | US-059 | Fluxo |
| **F33** | Pacote de handoff entre sessões/agentes | `handoff` | US-060 | Fluxo |
| **F34** | Agregar/alternar checkboxes entre notas | `todo` | US-061 | Fluxo |
| **F35** | Roadmap a partir de decisões | `roadmap` | US-062 | Fluxo |
| **F36** | Superfície de bloqueios/riscos | `blockers` | US-063 | Conhecimento |
| **F37** | Glossário / índice de termos | `glossary` | US-064 | Conhecimento |
| **F38** | Métricas de progresso | `progress` | US-065 | Conhecimento |
| **F39** | Changelog de decisões/aprendizados | `changelog` | US-066 | Conhecimento |
| **F40** | Mindmap Mermaid centrado em nota/tag | `mindmap` | US-067 | Conhecimento |
| transversal | Slash-commands de orquestração (Claude Code) | `.claude/commands/*` | US-068 | — |
| transversal | Helpers compartilhados (`render.mjs`, `analyze.mjs`) | — | US-069 | — |
| transversal | Cada tool com ≥ 5 testes; zero regressão | — | US-070 | — |

---

## Cluster Visual — explicar o que está acontecendo

### F21 — `diagram` (⭐): diagrama do sistema / grafo de notas · US-048
**Como** lead **quero** rodar `diagram` **para** obter um **diagrama Mermaid** do sistema (o grafo de
`[[wikilinks]]` entre notas, ou a estrutura por tipo/agente/tag) **para** enxergar a arquitetura da
memória de relance, no terminal e colável no Obsidian. É o engine por trás do slash-command
`/diagrama`, que manda múltiplos agentes arquitetarem o diagrama (US-068).
- **Tool:** `diagram` · **Feature:** F21
- **Aceite:**
  - `diagram [--scope links|tags|agents|types] [--save] [--json] [--all]`. Default `--scope links`.
  - `links`: nós = notas, arestas = `[[wikilinks]]` resolvidos por `wikilinksOf`; só liga arestas cujo
    alvo **existe** no escopo (não inventa nó fantasma).
  - `tags`/`agents`/`types`: grafo bipartido nota↔(tag|agent|type), agrupando por essa dimensão.
  - Saída é um **bloco ` ```mermaid `** válido (`flowchart LR`); ids de nó são **sanitizados**
    (`mermaidEscape`) — aspas, colchetes, pipes e quebras viram texto seguro, nunca quebram o parser.
  - `--save` persiste como nota `memory` (tag `diagram`); `--json` retorna `{ scope, nodes, edges }`.
  - Vault vazio → diagrama válido com nó-placeholder e **exit 0** (nunca emite Mermaid vazio inválido).

### F22 — `dashboard`: painel de visão geral · US-049
**Como** teammate **quero** rodar `dashboard` **para** ver, num painel ANSI compacto, o estado do
vault (contagem por tipo/agente, atividade recente, pins, saúde) **para** me situar sem rodar 5
comandos.
- **Tool:** `dashboard` · **Feature:** F22
- **Aceite:**
  - Mostra: projeto + enabled; total de notas; quebra **por tipo** e **por agente** com mini-barras;
    as N notas mais recentes; nº de pins; nº de órfãs (sem `[[links]]`).
  - Renderiza em **caixas** (`box`) com cores ANSI, degradando para texto puro sob `NO_COLOR`/`TERM=dumb`.
  - `--json` retorna `{ project, enabled, total, byType, byAgent, recent, pins, orphans }`.
  - Vault vazio → painel válido com zeros, **exit 0**.

### F23 — `tree`: árvore visual das notas · US-050
**Como** teammate **quero** rodar `tree` **para** ver a estrutura do vault como uma **árvore** com
glyphs por tipo **para** navegar a memória como navego um diretório.
- **Tool:** `tree` · **Feature:** F23
- **Aceite:**
  - Agrupa por **projeto → tipo → nota** (ou `--by agent`), com conectores `├─`/`└─` e glyph por tipo
    (memory `◆`, decision `★`, learning `✎`, communication `✉`, state `◉`).
  - `--depth N` limita a profundidade; `--all` cobre todos os projetos; `--json` retorna a árvore aninhada.
  - Cada folha mostra `nome` + `summary` curto (truncado, sem vazar largura). Vault vazio → árvore vazia clara.

### F24 — `activity`: sparkline de atividade · US-051
**Como** lead **quero** rodar `activity` **para** ver um **sparkline** de notas criadas por dia
**para** sentir o ritmo do time sem ler um relatório.
- **Tool:** `activity` · **Feature:** F24
- **Aceite:**
  - Conta notas por dia na janela (`--days N`, default 14) a partir de `created`; renderiza um
    sparkline unicode (`▁▂▃▄▅▆▇█`) + total + média + pico (dia).
  - `--by agent|type` quebra o sparkline por dimensão (uma linha cada). `--json` retorna
    `{ days, total, max, series: [{ date, count }] }`.
  - Janela sem notas → sparkline plano (tudo `▁`) e **exit 0**; normalização robusta (max 0 não divide por zero).

### F25 — `heatmap`: heatmap calendário · US-052
**Como** lead **quero** rodar `heatmap` **para** ver um **calendário** estilo GitHub das criações
**para** identificar lacunas e picos ao longo das semanas.
- **Tool:** `heatmap` · **Feature:** F25
- **Aceite:**
  - Grade semanas×dias-da-semana (`--weeks N`, default 12) com glyph de intensidade por quartil
    (` ·▪▩█` ou 5 níveis), legenda e contagem total.
  - `--json` retorna `{ weeks, cells: [{ date, count, level }] }`; níveis derivados de **quartis** do
    período (não thresholds fixos), com tratamento de tudo-zero.
  - Determinístico: "hoje" é injetável nos testes; sem datas → grade vazia válida, **exit 0**.

---

## Cluster Tokens — mais output do agente, mesmos tokens

### F26 — `brief`: context-pack budgetado · US-053
**Como** teammate **quero** rodar `brief [<query>] --budget N` **para** receber um **pacote de
contexto destilado** (pins + recentes + notas relevantes à query) **dentro de um orçamento de
tokens** **para** começar a tarefa já com a memória certa, sem varrer o vault inteiro (economia direta
de tokens do LLM).
- **Tool:** `brief` · **Feature:** F26
- **Aceite:**
  - Seleção priorizada: **pins** → relevância à `<query>` (se houver) → recência; cada nota entra como
    `título — summary` (corpo só com `--full`), parando quando o **orçamento de tokens** (`--budget`,
    default da config, fallback 1500) seria estourado pela próxima nota.
  - Estima tokens com `estimateTokens` (`analyze.mjs`); reporta `usedTokens`/`budget`/`included`/`dropped`.
  - `--json` retorna `{ budget, usedTokens, notes: [{ name, tokens }], dropped }`. Nunca ultrapassa o
    orçamento (a última nota que não cabe é **descartada**, não truncada no meio — contrato previsível).
  - Sem notas → pacote vazio claro, **exit 0**.

### F27 — `tokens`: estimador de tokens · US-054
**Como** mantenedor **quero** rodar `tokens [<ref>|--text "..."]` **para** estimar quantos tokens uma
nota (ou um conjunto, ou um texto) custaria **para** dimensionar o que mando ao agente.
- **Tool:** `tokens` · **Feature:** F27
- **Aceite:**
  - `tokens <ref>` estima a nota; `tokens --all`/sem ref agrega o projeto; `tokens --text "..."` estima
    um texto avulso. Heurística determinística (`estimateTokens`): ~chars/4 ajustado por palavras,
    documentada e estável (mesmo input → mesmo número).
  - Saída por nota: `nome — N tok`; agregada: total + média + top-N maiores. `--json` retorna
    `{ total, perNote: [{ name, tokens }] }` (ou `{ text, tokens }`).
  - `<ref>` inexistente → erro claro, **exit 1**; texto vazio → `0`, **exit 0**.

### F28 — `focus`: retrieval por orçamento · US-055
**Como** teammate **quero** rodar `focus <query> --budget N` **para** receber **só** as notas de maior
valor para a query que cabem no orçamento **para** dar foco ao agente sem ruído.
- **Tool:** `focus` · **Feature:** F28
- **Aceite:**
  - Rankeia notas por relevância à `<query>` (tags > termos de summary > termos de título/corpo, reuso
    do scorer de `analyze.mjs`), depois faz **fill por orçamento** de tokens como o `brief`.
  - `--top N` limita por contagem; `--budget N` limita por tokens; ambos compõem (o que estourar primeiro).
  - `--json` retorna `[{ name, score, tokens }]` ordenado por score. Query vazia → erro de uso, **exit 1**;
    sem candidatos → lista vazia clara, **exit 0**.

### F29 — `tldr`: resumo extrativo · US-056
**Como** teammate **quero** rodar `tldr <ref>` **para** obter um **resumo extrativo** curto da nota
(ou de um conjunto) **para** não reler o corpo inteiro.
- **Tool:** `tldr` · **Feature:** F29
- **Aceite:**
  - Extrai as N frases de maior peso (frequência de termos não-stopword, bônus para a 1ª frase e para
    frases com termos do título) — sem LLM, determinístico. `--sentences N` (default 3).
  - `tldr <ref>` resume uma nota; sem ref/`--all` resume o conjunto (1 linha por nota: `nome — frase`).
  - `--json` retorna `{ name, summary, sentences: [...] }`. Nota sem corpo → cai no `summary` do
    frontmatter; vazio total → string vazia, **exit 0**. `<ref>` ambíguo/inexistente → erro, **exit 1**.

### F30 — `recap`: recap de sessão em tokens mínimos · US-057
**Como** lead **quero** rodar `recap [--since <data>]` **para** um **resumo ultracompacto** do que
aconteceu na janela (decisões, entregas, comunicações, estados) **para** retomar o contexto gastando
o mínimo de tokens (complementa o `digest`/F14, que é verboso).
- **Tool:** `recap` · **Feature:** F30
- **Aceite:**
  - Coleta notas da janela (`--since`, default = hoje) e emite **bullets densos** agrupados por tipo, no
    máximo `--max N` (default 12) bullets, cada um `tipo: título` (+ `summary` curto se couber).
  - Prioriza `decision`/`state` (sinal alto) sobre `communication` (ruído); reporta quantas notas ficaram
    de fora. `--json` retorna `{ since, total, shown, bullets: [...] }`.
  - Janela vazia → recap válido ("nada na janela"), **exit 0**.

---

## Cluster Fluxo — comandos do dia a dia

### F31 — `plan`: scaffold de plano · US-058
**Como** teammate **quero** rodar `plan "<objetivo>"` **para** criar uma **nota de plano** já
estruturada (objetivo, passos, riscos, critério de pronto) **para** padronizar o arranque de uma tarefa.
- **Tool:** `plan` · **Feature:** F31
- **Aceite:**
  - Cria nota `memory` (tag `plan`) com seções fixas (`## Objetivo`, `## Passos`, `## Riscos`,
    `## Pronto quando`); passos pré-populados de `--steps "a;b;c"` viram checkboxes `- [ ]`.
  - Reusa o naming/arquivamento e a escrita do `save` (colisão de slug → sufixo). `--json` retorna
    `{ name, path, steps }`. Objetivo vazio → erro de uso, **exit 1**, nada escrito.

### F32 — `standup`: standup cross-agent · US-059
**Como** lead **quero** rodar `standup [--since <data>]` **para** ver, **por agente**, o que cada um
produziu na janela **para** rodar o "daily" sem perguntar a ninguém.
- **Tool:** `standup` · **Feature:** F32
- **Aceite:**
  - Agrupa as notas da janela por **agente**; para cada um lista entregas (`tipo: título`), contagem e
    último estado (`state`) conhecido. `--since` default = hoje.
  - `--json` retorna `[{ agent, count, items, lastState }]` ordenado por contagem desc. Sem atividade →
    "nenhum agente ativo na janela", **exit 0**.

### F33 — `handoff`: pacote de handoff · US-060
**Como** teammate **quero** rodar `handoff` **para** gerar um **pacote de passagem** (estado atual,
itens abertos, próximos passos, notas-chave) **para** que a próxima sessão/agente retome sem custo —
agent teams não têm resume, então o handoff É a continuidade.
- **Tool:** `handoff` · **Feature:** F33
- **Aceite:**
  - Reúne: últimos `state` por agente; checkboxes abertos (`- [ ]`) via a mesma extração do `todo`;
    pins; as decisões recentes. Emite markdown coeso pronto para colar no início da próxima sessão.
  - `--save` persiste como nota `memory` (tag `handoff`) com wikilinks para as fontes; `--json` retorna
    `{ states, open, pins, decisions }`. Vault vazio → pacote mínimo válido, **exit 0**.

### F34 — `todo`: checkboxes agregados · US-061
**Como** teammate **quero** rodar `todo` **para** ver **todos** os checkboxes abertos (`- [ ]`)
espalhados pelas notas num só lugar **para** não perder pendência **para** poder marcá-las como feitas.
- **Tool:** `todo` · **Feature:** F34
- **Aceite:**
  - Varre o corpo das notas extraindo itens `- [ ]` (aberto) e `- [x]` (feito); lista os abertos por
    nota com a origem. `--done` mostra também os concluídos; `--all` cobre todos os projetos.
  - `todo check <ref> "<texto>"` alterna um item para `- [x]` na nota (reescreve corpo via `formatNote`,
    preservando frontmatter); match por substring do texto, **exige** unicidade (ambíguo → erro, exit 1).
  - `--json` retorna `{ open, done, items: [{ note, text, checked }] }`. Sem checkboxes → lista vazia, exit 0.

### F35 — `roadmap`: roadmap de decisões · US-062
**Como** lead **quero** rodar `roadmap` **para** ver as **decisões** (`type: decision`) organizadas
numa linha do tempo **para** comunicar a direção do projeto.
- **Tool:** `roadmap` · **Feature:** F35
- **Aceite:**
  - Coleta `decision` (e `--include learning`), ordena por `created`, agrupa por mês (`YYYY-MM`) e emite
    markdown `## YYYY-MM` + bullets `título — summary`. `--save` persiste; `--json` retorna
    `{ months: [{ month, items }] }`.
  - Sem decisões → roadmap vazio claro, **exit 0**.

---

## Cluster Conhecimento — densificar e medir a memória

### F36 — `blockers`: bloqueios/riscos · US-063
**Como** lead **quero** rodar `blockers` **para** ver as notas marcadas como **risco/bloqueio**
(tag `blocker`/`risk`/`blocked` ou checkbox `- [ ] ⚠`/palavra-chave) **para** atacar o que trava o time.
- **Tool:** `blockers` · **Feature:** F36
- **Aceite:**
  - Seleciona notas por tags de risco **ou** por marcadores no corpo (`blocked`, `blocker`, `risco`,
    `⚠`), de forma case-insensitive; lista `nome — motivo (tag/linha)`.
  - `--json` retorna `[{ name, reason, source }]`. Sem bloqueios → "nenhum bloqueio", **exit 0**.

### F37 — `glossary`: glossário de termos · US-064
**Como** librarian **quero** rodar `glossary` **para** extrair um **índice de termos** recorrentes nos
summaries/títulos com as notas onde aparecem **para** dar um vocabulário comum ao time.
- **Tool:** `glossary` · **Feature:** F37
- **Aceite:**
  - Extrai termos significativos (não-stopword, freq ≥ `--min`, default 2), ordena por frequência e
    lista cada termo com as notas-fonte (top-N). `--json` retorna `[{ term, count, notes }]`.
  - Reusa o stopword/tokenização de `analyze.mjs`. Vault vazio → glossário vazio, **exit 0**.

### F38 — `progress`: métricas de progresso · US-065
**Como** lead **quero** rodar `progress` **para** ver **percentuais** de conclusão (checkboxes
feitos/total, planos com "pronto", razão decisão/risco) **para** medir o avanço objetivamente.
- **Tool:** `progress` · **Feature:** F38
- **Aceite:**
  - Calcula: checkboxes `done/total` (% + barra), nº de planos (tag `plan`) e quantos têm todos os itens
    feitos, nº de bloqueios abertos. Renderiza barras (`bar`) com cor por severidade.
  - `--json` retorna `{ checkboxes: { done, total, pct }, plans: { total, complete }, blockers }`.
  - Sem dados → tudo zero sem divisão por zero, **exit 0**.

### F39 — `changelog`: changelog de decisões/aprendizados · US-066
**Como** mantenedor **quero** rodar `changelog [--since <data>]` **para** gerar um **changelog** em
markdown a partir das notas `decision`/`learning` **para** publicar o que mudou sem escrever à mão.
- **Tool:** `changelog` · **Feature:** F39
- **Aceite:**
  - Agrupa por data (`created`) decrescente; cada entrada `- **título** — summary` com badge do tipo
    (`[decisão]`/`[aprendizado]`). `--since` filtra; `--save` persiste; `--json` retorna
    `{ since, entries: [{ date, type, title, summary }] }`.
  - Janela vazia → changelog vazio claro, **exit 0**.

### F40 — `mindmap`: mindmap centrado · US-067
**Como** teammate **quero** rodar `mindmap <ref|--tag t>` **para** um **Mermaid `mindmap`** centrado
numa nota (ou tag) com seus vizinhos por link/tag **para** explorar um tópico visualmente. Complementa
o `diagram` (F21) com foco local — engine do slash-command `/mindmap`.
- **Tool:** `mindmap` · **Feature:** F40
- **Aceite:**
  - `mindmap <ref>`: raiz = a nota; ramos = `[[wikilinks]]` (1º nível) e notas que compartilham tags.
    `mindmap --tag <t>`: raiz = a tag; ramos = notas com a tag. Saída é bloco ` ```mermaid ` `mindmap`
    válido com rótulos sanitizados.
  - `--depth N` (default 1) expande vizinhos; `--save`/`--json` (`{ root, branches }`). `<ref>`
    inexistente → erro, **exit 1**; tag sem notas → mindmap só com a raiz, **exit 0**.

---

## Transversal

### US-068 — Slash-commands de orquestração no Claude Code
**Como** vibe-coder **quero** slash-commands (`/diagrama`, `/standup`, `/handoff`, `/recap`, `/plano`,
`/mindmap`) **que mandam a memory-team usar os engines acima** **para** disparar fluxos multiagente
sem decorar a CLI.
- **Entrega:** arquivos `.claude/commands/<nome>.md` que instruem o lead a (1) ler o vault, (2) acionar
  a tool correspondente, (3) — no caso de `/diagrama` e `/mindmap` — **fan-out de agentes** que
  arquitetam o diagrama por subsistema e o reviewer consolida.
- **Aceite:** cada arquivo referencia a tool real e respeita a disciplina de output do protocolo
  (resultado + onde a nota caiu, sem narração). *(Camada de prompt — validada por inspeção, não por
  unit test; ver US-070.)*

### US-069 — Helpers compartilhados (DRY) e puros
**Como** mantenedor **quero** que a apresentação e a análise de texto vivam em **módulos puros
reusáveis** (`render.mjs`, `analyze.mjs`) **para** que os 20 comandos fiquem finos e a lógica seja
testada uma vez.
- **Entrega:** `render.mjs` (ANSI/cores, `bar`, `sparkline`, `box`, `tree`, `heatGlyph`,
  `mermaidEscape`) e `analyze.mjs` (`estimateTokens`, `extractiveSummary`, `scoreByQuery`, stopwords),
  ambos **sem** I/O de console e sem `process.exit` — só funções puras.
- **Aceite:** importados pelos comandos; têm testes próprios; degradam cores sob `NO_COLOR`/`TERM=dumb`;
  `estimateTokens` é determinístico e monotônico (texto maior ⇒ ≥ tokens).

### US-070 — Cada tool nova vem com testes; zero regressão
**Como** mantenedor **quero** que cada uma das 20 tools tenha **≥ 5 testes** `node:test` com vault
temporário **para** manter a suíte verde e provar que a base não regrediu.
- **Aceite:**
  - Cada tool: happy path in-process + ramos de borda (vault vazio, `<ref>` inexistente/ambíguo, flags,
    `--json`); tools que mutam (`plan`, `todo check`, `*/--save`) asseguram round-trip de frontmatter
    desconhecido via `formatNote`; tools com Mermaid validam bloco e sanitização.
  - `npm test` passa **inteiro**; as 34 tools + statusline da base **não** mudam de contrato (suíte da
    base permanece verde). Meta de cobertura nova: **≥ 100 testes** (20 × 5).

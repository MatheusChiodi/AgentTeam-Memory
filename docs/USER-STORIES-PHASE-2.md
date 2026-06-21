# AgentTeam-Memory — User Stories (Fase 2)

> Segunda onda de expansão: **observabilidade em tempo real e integração nativa com o
> Claude Code**. Continua a numeração da [Fase 0/1](./USER-STORIES.md) — começa em **US-033**
> (a base vai até US-032) e em **F11** (a base vai até F10).
>
> Tema da fase: o vault deixa de ser só um arquivo morto consultável e passa a **transbordar para
> a própria interface do Claude Code** (statusline), a **registrar o custo/uso das sessões** e a
> oferecer **ferramentas de operação ao vivo** (watch, digest, doctor). Referência de arquitetura:
> [`ARCHITECTURE-PHASE-2.md`](./ARCHITECTURE-PHASE-2.md).

## Convenção (herdada da Fase 1)

`<ref>` = referência frouxa a uma nota (basename exato → fragmento de slug → substring de
nome/summary), resolvida por `resolveNotes`. Toda tool de leitura aceita `--json` e, nesse modo,
emite **apenas** `res.data`. Mutações reescrevem via `formatNote` preservando frontmatter desconhecido.

## Mapa da fase

| # | Feature | Tool/entrypoint | US |
| --- | --- | --- | --- |
| **F11** ⭐ | Orçamento e uso **em tempo real** no statusline do Claude Code | `statusline.mjs` (standalone) | US-033 · US-034 · US-035 · US-036 |
| **F12** | Ledger de uso/custo (histórico das sessões) | `usage` | US-037 |
| **F13** | Live tail do vault (acompanhar notas ao vivo) | `watch` | US-038 |
| **F14** | Digest de sessão (sumário automático de uma janela) | `digest` | US-039 |
| **F15** | Health check da instalação | `doctor` | US-040 |
| **F16** | Configuração central do memory-team | `config` | US-041 |
| **F17** | Templates de nota | `template` | US-042 |
| **F18** | Pin / destaque de notas | `pin` | US-043 |
| **F19** | Snapshot / checkpoint do vault | `snapshot` | US-044 |
| **F20** | Sugestão automática de wikilinks | `relate` | US-045 |
| transversal | Tempo real barato/à prova de falha · testes | — | US-046 · US-047 |

---

## F11 — Orçamento e uso em tempo real (⭐ a feature-estrela)

> **Dor:** hoje, para saber quanto do plano/contexto já consumi numa sessão do Claude Code,
> preciso rodar `/usage` manualmente, sair do fluxo e ler um relatório. Quero ver isso **passivamente,
> sempre**, no rodapé da própria CLI — que se atualiza a cada turno.
>
> **Mecanismo:** o Claude Code suporta um **statusLine** customizado (`settings.json → statusLine`):
> um comando que recebe um JSON de estado via **stdin** a cada atualização da tela e imprime **uma
> linha** que o Claude Code renderiza no rodapé. É o único ponto de extensão que entrega
> "informação passiva e contínua". A tool é, portanto, um **entrypoint standalone** (`statusline.mjs`),
> não um comando do registry (ver arquitetura — motivo: performance/sem stdin no `ctx`).
>
> **O payload já entrega o que o `/usage` mostra.** Verificado na doc oficial: o JSON do statusLine
> traz `rate_limits.five_hour.used_percentage` e `rate_limits.seven_day.used_percentage` (= o **uso do
> plano** da assinatura — a dor exata) e um `resets_at` (epoch) por janela; traz também `context_window`
> (`used_percentage`, `context_window_size`, `current_usage.{input,output,cache_*}_tokens`) e
> `cost.total_cost_usd`. Logo, **não é preciso parsear o transcript** no caminho feliz — só como
> fallback para versões antigas (`< 2.1.132`).
>
> **Ressalva honesta (vira critério de aceite, não promessa furada):** `rate_limits` só está presente
> para contas **Claude.ai Pro/Max** e **após a 1ª resposta** da sessão; com **API key / Bedrock /
> Vertex** o campo não existe (esses planos não têm janela de 5h/7d). Quando ausente, o statusline
> **degrada** para `context_window` + `cost` e sinaliza o plano como `n/a`.

### US-033 — Ver o uso do plano em tempo real, sem rodar `/usage`
**Como** usuário Claude.ai Pro/Max **quero** que o rodapé mostre, sempre e atualizado a cada turno,
**quanto do meu plano já gastei** (janela de 5h e de 7 dias) **para** não precisar interromper o fluxo
com `/usage`.
- **Tool:** `statusline.mjs` (standalone) · **Feature:** F11
- **Aceite:**
  - Lê o JSON de status do **stdin** e imprime **uma única linha** em stdout, sem ruído em stderr.
  - Segmento `plan:` mostra `rate_limits.five_hour.used_percentage` e
    `rate_limits.seven_day.used_percentage` (ex.: `plan 5h 23% · 7d 41%`), que é exatamente o que o
    `/usage` reporta — a dor literal resolvida.
  - Mostra opcionalmente o `resets_at` de cada janela como tempo relativo ("⟳2h13"). `resets_at` é
    **epoch em segundos**; o tempo é relativo a `Date.now()` com **clamp**: janela já reaberta mostra
    "agora", nunca tempo negativo (aceite determinístico).
  - **Degradação por janela, independente** (A6): cada janela (`five_hour`, `seven_day`) só entra se
    trouxer `used_percentage` finito — uma presente e outra ausente não vaza `undefined%`.
  - **Degradação total honesta:** quando `rate_limits` está ausente por inteiro (API key / Bedrock /
    Vertex, ou antes da 1ª resposta), o segmento vira `plan n/a` e o foco recai sobre contexto + custo
    (US-034) — sem inventar número de plano.
  - Resiliente: stdin vazio/JSON inválido → fallback curto e **sai 0** (nunca derruba a render do
    Claude Code, nunca trava). Tudo em **uma passada**, **zero dependências**.

### US-034 — Enxergar contexto e custo junto, com barra e alertas de teto
**Como** usuário **quero** ver, ao lado do plano, quanto da **janela de contexto** e quanto de
**custo** já consumi, com uma barra e cores que mudam perto do limite **para** perceber o risco de
estourar antes que aconteça.
- **Tool:** `statusline.mjs` · **Feature:** F11
- **Aceite:**
  - **Contexto** prioriza **recalcular** a partir dos tokens absolutos `context_window.current_usage`
    (`input + cache_read + cache_creation`) sobre o limite correto; só então usa `used_percentage`; e por
    fim, na ausência de `context_window` (versão `< 2.1.132`), o **fallback** soma a última `usage` do
    `transcript_path`.
  - **Limite da janela:** `[1m]` no `model.id` tem **precedência** = 1M. Motivo (verificado pelo
    researcher): `context_window_size` do payload vem `200000` mesmo em janela estendida (bug Claude Code
    #36725); confiar nele inflaria o `%` em 5×. Sem `[1m]`, usa `context_window_size`; senão 200k, com
    `exceeds_200k_tokens` como sinal redundante. O limite custom é configurável (F16/US-041).
  - **Custo** usa `cost.total_cost_usd` **quando o payload o expuser**; ausente → omite o segmento `$`.
  - Renderiza uma **barra** textual do uso de contexto (ex.: `[█████░░░░░] 53%`).
  - **Limiares** de severidade (default `warn=70%`, `danger=90%`, vindos da config — F16): neutro,
    atenção e crítico. Cores **ANSI por padrão** (o Claude Code renderiza ANSI no rodapé), degradando
    para texto puro sob `NO_COLOR`/`TERM=dumb` (N5).

### US-035 — Ver o contexto do memory-team junto do consumo
**Como** teammate **quero** que o rodapé também mostre o projeto detectado, se o enforcement está
ativo e quantas notas já existem **para** confirmar, de relance, que estou escrevendo memória no
lugar certo.
- **Tool:** `statusline.mjs` · **Feature:** F11
- **Aceite:**
  - Segmento `mem:` com **projeto** detectado (de `workspace.current_dir`/cwd via `lib.mjs`),
    flag **enabled** (marcador `.memory-team`) e **contagem de notas** do projeto + global.
  - Reaproveita `lib.mjs`/`notes.mjs` (sem reimplementar resolução de vault) — leitura barata,
    sem varrer o vault inteiro a cada turno (conta por projeto, não `--all`).
  - A composição dos segmentos é **estável e ordenada** (mem · contexto · custo · modelo), separada
    por um delimitador legível.

### US-036 — Instalar/remover o statusline sem editar JSON à mão
**Como** mantenedor **quero** rodar um comando que registre (ou remova) o statusline no meu
`settings.json` **para** ativar a feature sem mexer no arquivo manualmente e arriscar quebrá-lo.
- **Tool:** `statusline.mjs --install` / `--uninstall` (e `--demo`) · **Feature:** F11
- **Aceite:**
  - `--install` faz **merge não-destrutivo** em `~/.claude/settings.json` adicionando o bloco
    `statusLine` que aponta para este script; preserva o resto do arquivo; é **idempotente**.
  - `--uninstall` remove apenas o bloco `statusLine` que o memory-team escreveu.
  - `--demo` roda o pipeline com um payload de exemplo embutido (sem precisar do Claude Code),
    imprimindo a linha como ela apareceria — serve de teste manual e de doc viva.
  - Sem `settings.json`, cria um mínimo válido; JSON existente inválido → erro claro, **não** sobrescreve.

---

## F12 — Ledger de uso/custo (histórico)

### US-037 — Agregar o custo e os tokens das minhas sessões
**Como** usuário **quero** rodar `usage` **para** ver, de forma agregada, quanto custaram e quantos
tokens consumiram minhas sessões (por dia/projeto) **para** ter o histórico que o statusline mostra
só "agora".
- **Tool:** `usage` · **Feature:** F12
- **Aceite:**
  - Varre os transcripts de sessão (`.jsonl`) acessíveis e agrega `cost`/tokens por **dia** e por
    **projeto**; janela ajustável por `--since YYYY-MM-DD` e `--limit n`.
  - `--json` retorna `{ totalUsd, totalTokens, byDay: [...], byProject: [...] }`.
  - `--save` persiste o agregado como uma nota `memory` (tag `usage`), virando histórico auditável.
  - Sem transcripts acessíveis → mensagem clara, `data` zerado, exit 0 (não é erro).

---

## F13 — Live tail do vault

### US-038 — Acompanhar as notas do time ao vivo
**Como** lead **quero** rodar `watch` **para** ver, em tempo real, cada nota nova que os teammates
escrevem no vault **para** acompanhar o progresso sem ficar rodando `recent` repetidamente.
- **Tool:** `watch` · **Feature:** F13
- **Aceite:**
  - Observa a partição do projeto (e global) com `fs.watch` e, a cada nota **criada**, imprime uma
    linha `HH:MM tipo/agent — título` (com `summary` quando presente).
  - `--all` observa todos os projetos; encerra limpo em `SIGINT` (Ctrl-C) sem stacktrace.
  - Não relê notas pré-existentes (só eventos a partir do start); dedup de eventos duplicados do FS.
  - Como é um processo longo, fica **fora** do contrato `lines/data` padrão (stream contínuo) — documentado.

---

## F14 — Digest de sessão

### US-039 — Fechar a sessão com um sumário automático
**Como** lead **quero** rodar `digest --since <data>` **para** obter um resumo em markdown do que o
time produziu numa janela **para** registrar um fecho de sessão sem reler nota por nota.
- **Tool:** `digest` · **Feature:** F14
- **Aceite:**
  - Coleta as notas da janela (`--since`, default = hoje) e gera um markdown agrupado por **agente**
    e por **tipo**, com bullets de `título — summary` e contagens.
  - `--save` persiste o digest como nota `memory` (tag `digest`), com wikilinks para as notas-fonte.
  - `--json` retorna `{ since, total, byAgent, byType, notes: [...] }`.
  - Janela vazia → digest válido informando "nenhuma nota na janela", exit 0.

---

## F15 — Health check

### US-040 — Diagnosticar a instalação do memory-team
**Como** mantenedor **quero** rodar `doctor` **para** checar se hooks, settings, statusline e vault
estão sãos **para** descobrir uma instalação meio-quebrada antes que ela me atrapalhe.
- **Tool:** `doctor` · **Feature:** F15
- **Aceite:**
  - Verifica: vault acessível e gravável; `settings.json` parseável; hooks `TaskCompleted`/`TeammateIdle`
    registrados; `statusLine` apontando para um script existente; integridade do vault (reusa `validate`).
  - Cada check vira uma linha `✓/✗/⚠ nome — detalhe`; **exit 1** se houver ao menos um `✗`.
  - `--json` retorna `{ ok, checks: [{ name, status, detail }] }`.
  - Não corrige nada por padrão (read-only diagnostic); apenas reporta e, quando útil, sugere o fix.

---

## F16 — Configuração central

### US-041 — Ler e ajustar preferências do memory-team
**Como** usuário **quero** rodar `config get/set <chave> [valor]` **para** ajustar comportamentos
(limiares do statusline, formato de data, limite de contexto custom) **para** não ter defaults
cravados no código.
- **Tool:** `config` · **Feature:** F16
- **Aceite:**
  - `config list` mostra todas as chaves + valor efetivo (default vs. override); `config get <k>`
    imprime uma; `config set <k> <v>` persiste num `config.json` do vault.
  - Chaves conhecidas têm **default embutido**; chave desconhecida em `set` é aceita mas avisada;
    em `get` retorna vazio sem erro.
  - Valores tipados o suficiente (números viram número); `--json` retorna o objeto de config efetivo.
  - É a fonte dos limiares do statusline (F11/US-034) e do limite de contexto custom.

---

## F17 — Templates de nota

### US-042 — Criar uma nota a partir de um template
**Como** teammate **quero** rodar `template <nome> "<título>"` **para** gerar uma nota já com a
estrutura de seções que aquele tipo de entrega pede **para** padronizar e ganhar tempo.
- **Tool:** `template` · **Feature:** F17
- **Aceite:**
  - `template list` lista os templates disponíveis (embutidos + os do vault em `_templates/`).
  - `template <nome> "<título>"` cria uma nota preenchendo o corpo com o esqueleto do template e o
    frontmatter canônico (reusa o naming/arquivamento do `save`).
  - Template inexistente → erro claro listando os válidos, exit 1, nada escrito.
  - Templates suportam placeholders mínimos (`{{title}}`, `{{date}}`, `{{project}}`, `{{agent}}`).
  - **Placeholder desconhecido** (ex.: `{{foo}}`) permanece **literal** no corpo — não é substituído
    nem removido (contrato previsível; N2).
  - **Não sobrescreve state** (US-004/US-031): se o template declara `type: state` e o `save` é
    idempotente (`data.created === false`), o template **preserva** a nota existente e reporta
    `created:false` — nunca clobba um state em silêncio (B1 da revisão).

---

## F18 — Pin / destaque de notas

### US-043 — Fixar as notas que importam
**Como** lead **quero** rodar `pin <ref>` **para** marcar notas-chave **para** que apareçam no topo
de `search`/`list`/`recent` e não se percam no volume.
- **Tool:** `pin` · **Feature:** F18
- **Aceite:**
  - `pin <ref>` adiciona `pinned: true` ao frontmatter (reescreve via `formatNote`); `pin <ref> --off`
    remove; `pin --list` lista as fixadas.
  - Notas fixadas são ordenadas **antes** das demais em `search`/`list`/`recent` (desempate normal entre elas).
  - `<ref>` ambíguo/inexistente → erro claro, exit 1, sem escrever.
  - Preserva todo o frontmatter desconhecido no round-trip (invariante US-030).

---

## F19 — Snapshot / checkpoint do vault

### US-044 — Tirar um checkpoint do vault antes de uma operação arriscada
**Como** mantenedor **quero** rodar `snapshot` **para** congelar o estado atual do vault **para** poder
voltar atrás se um `retag`/`prune`/`import` em massa der errado.
- **Tool:** `snapshot` · **Feature:** F19
- **Aceite:**
  - `snapshot` cria um checkpoint datado em `_snapshots/<timestamp>/` (cópia das notas, sem `_snapshots`
    recursivo); `snapshot --list` lista os existentes com data e contagem.
  - `snapshot --restore <id>` repõe o vault a partir de um checkpoint, **exigindo** a flag explícita
    (operação destrutiva — invariante US-031) e fazendo antes um snapshot de segurança.
  - `--restore` é **reset** (limpar-e-repor), não merge: notas criadas **após** o checkpoint
    desaparecem no restore (esse é o objetivo — "voltar atrás"); `_snapshots/` nunca é apagado.
  - `--restore <id>` com **id inexistente/ambíguo** → erro claro, exit 1, **nada tocado** (A5).
  - O snapshot de **segurança** (feito antes do restore) não polui o `--list` por padrão (A2).
  - `--json` retorna `{ id, path, count }` na criação e a lista na listagem.
  - **Cópia direta de arquivo** (não serializa via `export`/F9): preserva os bytes da nota com
    fidelidade total e zero perda de formatação — propósito distinto do `export` (serialização lógica
    portável). Zero-dependency, sem ferramenta externa. *(A3 relaxado: reuso de `export` não é requisito.)*

---

## F20 — Sugestão automática de wikilinks

### US-045 — Receber sugestões de ligações entre notas
**Como** librarian **quero** rodar `relate <ref>` **para** ver quais outras notas são candidatas a
`[[wikilink]]` por similaridade de tags/summary **para** adensar o grafo sem caçar manualmente.
- **Tool:** `relate` · **Feature:** F20
- **Aceite:**
  - Dada `<ref>`, rankeia outras notas por similaridade (tags em comum > termos de summary > tipo),
    ignorando as já ligadas; mostra top-N com o score e o motivo.
  - `relate <ref> --apply` adiciona os top sugeridos ao `related` da nota (reescreve via `formatNote`),
    **não** destrutivo sobre o que já existe; sem `--apply` é só sugestão (dry-run).
  - `--json` retorna `[{ name, score, reason }]`; sem candidatos → lista vazia clara, exit 0.

---

## Integridade e qualidade (transversal — herdado e estendido)

### US-046 — Tempo real não pode custar caro nem quebrar a CLI
**Como** usuário **quero** que as features "ao vivo" (statusline, watch) sejam **baratas e à prova de
falha** **para** que rodar a cada turno não me deixe a CLI lenta nem derrube a render.
- **Tool:** `statusline.mjs`, `watch` · **Feature:** F11/F13
- **Aceite:**
  - O statusline executa em uma passada, lê **só** a cauda necessária do transcript, e em qualquer
    erro degrada para um fallback curto saindo **0** (nunca lança para o Claude Code).
  - Nenhuma das duas adiciona dependência externa; ambas respeitam os princípios de design da Fase 1.

### US-047 — Toda tool nova da Fase 2 vem com testes
**Como** mantenedor **quero** que cada nova tool tenha testes `node:test` com vault temporário
**para** manter a suíte verde e sem mocks (invariante US-032 estendida à Fase 2).
- **Tool:** transversal · **Feature:** F11–F20
- **Aceite:**
  - Cada tool de registry tem happy path in-process + ramos de borda; o `statusline.mjs` é testado
    alimentando um payload sintético via stdin e assertando os segmentos da linha de saída.
  - `npm test` continua passando inteiro; nenhuma regressão nas 25 tools da base.

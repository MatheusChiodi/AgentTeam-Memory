# 18 prompts para arquitetura

Prompts prontos para colar no **lead** (no `claude`, dentro de um projeto) quando o trabalho é
**desenhar antes de codar**: definir a stack, modelar dados, separar módulos e registrar decisões.
Cada um exercita o agent team + o vault central de memória. Troque as partes entre `<colchetes>`.
Os prompts estão em inglês (o time opera em inglês); a **explicação de cada um está em português**:
diz **o que o prompt faz** e **como usa o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez por projeto para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).

---

## A. Desenho de sistema

### 1. Esboçar a arquitetura de alto nível
> Goal: design the high-level architecture for `<system>`. Don't write code. The `researcher` searches the vault (`search architecture`, `search <domain>`) for prior decisions, the team agrees on the major components and how they talk, and the `executor` records the result as a `decision` note (`save decision … --task <id>`) with a Mermaid diagram of the boxes and arrows.

**O que faz:** força um desenho de blocos e fluxos antes de qualquer código, partindo do que já foi
decidido no vault, e deixa o diagrama persistido numa nota de decisão para a próxima sessão consultar.

### 2. Definir requisitos antes de desenhar
> Before any design, the `researcher` writes the functional and non-functional requirements for `<system>` (latency, scale, consistency, budget) as a `memory` note, and `SendMessage`s them to the `reviewer`, who flags any requirement that is vague or untestable. Only then do we discuss the architecture.

**O que faz:** ancora o desenho em requisitos explícitos e revisados em vez de suposições; a nota de
requisitos vira a régua contra a qual toda decisão posterior é checada.

### 3. Mapear contextos e fronteiras (boundaries)
> Identify the bounded contexts of `<system>` and the boundaries between them. The `researcher` proposes the split, the `reviewer` argues where a boundary is wrong or leaky, and the team records the agreed module map as a `decision` note with a Mermaid diagram showing each context and its owned data.

**O que faz:** separa o sistema em módulos com responsabilidades claras e ataca acoplamento cedo; o
diagrama e a nota deixam explícito quem é dono de qual dado, evitando vazamento de responsabilidade.

### 4. Planejar antes de construir (researcher → executor)
> Don't write code yet. The `researcher` produces a build plan for `<task>` (steps, files to touch, risks) and hands it to the `executor` via `SendMessage`. The `executor` reviews it for feasibility, pushes back on anything underspecified, and only then is the plan saved as a `decision` note with `--task <id>`.

**O que faz:** materializa a separação descoberta→execução do time: o plano é negociado entre as duas
roles antes de tocar em arquivo, e fica registrado para guiar (e auditar) a implementação.

## B. Stack e tecnologia

### 5. Escolher e justificar a stack
> Recommend a stack for `<project>`. The `researcher` lists viable options with pros/cons against our requirements; the `reviewer` challenges each choice (lock-in, learning curve, ops cost). Record the chosen stack and the rejected alternatives as a `decision` note tagged `stack` so the rationale survives.

**O que faz:** transforma a escolha de tecnologia numa decisão argumentada e revisada, e preserva tanto
a opção vencedora quanto as descartadas — para ninguém reabrir a discussão sem contexto depois.

### 6. Validar a stack padrão contra o caso
> We default to React 19 + TS + Vite (web) and CF Workers + KV (backend). For `<this project>`, the `reviewer` argues whether the default fits or where a deviation is justified. Record the verdict as a `decision` note tagged `stack`; if we deviate, note exactly why.

**O que faz:** evita aplicar a stack padrão no automático: pede uma checagem adversarial do encaixe e
registra qualquer desvio com justificativa, mantendo coerência entre projetos sem ser dogmático.

### 7. Avaliar adicionar uma dependência
> We're considering adding `<library>`. The `researcher` checks the vault for prior notes on it (`search <library>`) and gathers size, maintenance, and alternatives; the `reviewer` weighs it against just writing it ourselves. Record the call as a `decision` note tagged `dependency`.

**O que faz:** trata "puxar uma lib" como decisão arquitetural — pesquisa histórico e alternativas e
deixa o trade-off (build vs. buy) gravado, para a próxima avaliação parecida começar pronta.

## C. Modelagem de dados

### 8. Modelar o schema de dados
> Design the data model for `<feature/system>`. The `researcher` lists the entities, relationships, and access patterns; the `executor` proposes the schema (tables/collections/KV keys) and records it as a `decision` note with a Mermaid ER diagram. The `reviewer` checks for missing indexes and N+1 read patterns.

**O que faz:** parte dos padrões de acesso para chegar ao schema (não o contrário), documenta o modelo
com um diagrama ER e já recebe uma revisão dos pontos que costumam doer em produção.

### 9. Escolher o armazenamento certo
> For `<data>`, the `researcher` compares storage options (relational, KV, document, cache) against our access patterns and consistency needs; the `reviewer` probes each for the failure mode we'd hate most. Record the choice as a `decision` note tagged `data,storage`.

**O que faz:** alinha a escolha de armazenamento ao padrão de acesso real e às garantias necessárias,
e registra qual modo de falha foi aceito — informação que raramente fica escrita em lugar nenhum.

### 10. Planejar evolução de schema / migração
> We need to change `<existing schema>`. The `executor` drafts a backward-compatible migration plan (expand/contract), lists what could break, and the `reviewer` plays devil's advocate against each step. Record the migration plan as a `decision` note tagged `migration`.

**O que faz:** trata mudança de schema como operação arriscada: plano expand/contract, lista de quebras
possíveis e checagem adversarial, com tudo preservado numa nota para executar com segurança.

## D. Decisões arquiteturais (ADR)

### 11. Registrar uma decisão arquitetural (ADR)
> Record an architecture decision for `<choice>` in ADR form: context, options considered, decision, and consequences. Save it as a `decision` note with `--task <id>` tagged `adr`, and link the related notes with `[[wikilinks]]`. The `librarian` then runs `index` so it shows up in the project `_index.md`.

**O que faz:** padroniza decisões no formato ADR (contexto/opções/decisão/consequências) e as conecta às
notas relacionadas, virando um registro pesquisável e indexado em vez de uma conversa perdida.

### 12. Revisitar uma decisão antiga
> We're reconsidering `<past decision>`. The `researcher` finds the original `decision` note (`search <topic>`), summarizes the context that justified it, and the team decides whether it still holds. Record a new `decision` note that supersedes the old one and links back to it.

**O que faz:** usa o vault para recuperar o porquê original antes de mudar de rumo, e encadeia a nova
decisão à antiga via wikilink — preservando a linha do tempo do raciocínio em vez de apagá-la.

### 13. Consultar a memória antes de desenhar
> Before we design `<topic>`, run `search <topic>`, `search architecture`, and `search <related-tag>` and summarize every relevant decision and learning (summary + tags) so we don't contradict or re-litigate past architecture work.

**O que faz:** um passo puro de leitura que traz à tona ADRs e aprendizados anteriores; barato e
utilizável até sem o time completo, evita que o novo desenho colida com o que já foi decidido.

## E. Comparar abordagens e trade-offs

### 14. Comparar abordagens (painel de juízes)
> Have three teammates each propose a different architecture for `<problem>` — e.g. simplest, most scalable, most familiar to our stack. They critique each other via `SendMessage`, score the trade-offs, then the team records the winning approach and why, with the runners-up noted, as a `decision` note.

**O que faz:** gera opções diversas e as pontua por crítica entre pares antes de decidir; melhor que
iterar na primeira ideia, e o raciocínio (inclusive os perdedores) fica preservado numa nota.

### 15. Tabela de trade-offs explícita
> For `<decision>`, the `researcher` builds a trade-off table (rows = options, columns = the dimensions we care about: cost, complexity, scale, time-to-ship) and the `reviewer` challenges the scoring. Record the table and the final pick as a `decision` note tagged `tradeoff`.

**O que faz:** torna o trade-off visível e questionável numa tabela, em vez de uma escolha por intuição;
a nota guarda tanto a tabela quanto a decisão, deixando claro o que foi priorizado e o que foi cedido.

### 16. Provar o ponto mais arriscado primeiro (spike)
> Identify the single riskiest assumption in the `<design>`. The `executor` builds a throwaway spike to test only that, the `reviewer` judges whether it held, and we record the result as a `learning` note before committing to the full architecture.

**O que faz:** ataca a incerteza maior com um protótipo descartável antes de comprometer o desenho
inteiro, e captura o resultado como aprendizado — barato agora, caro se descoberto depois.

## F. Escalabilidade e robustez

### 17. Revisar o desenho para escala
> The `reviewer` stress-tests the `<design>` against `<expected load>`: where is the bottleneck, what breaks first, what's the failure mode under partial outage? The `researcher` checks the vault for how we scaled similar systems before. Record the findings and any design changes as a `decision` note tagged `scalability`.

**O que faz:** submete o desenho a uma análise de carga e falha parcial guiada pelo histórico do vault,
e registra gargalos e mudanças resultantes — antecipando o que só apareceria sob tráfego real.

### 18. Integrar um projeto existente à memória de arquitetura
> This repo is new to the team. The `researcher` maps its architecture, module boundaries, data model, and key conventions and writes 3–5 atomic `memory`/`decision` notes (one concept each, well tagged); the `librarian` runs `index` so future architecture work starts informed.

**O que faz:** dá o pontapé inicial no vault de arquitetura de um projeto, para o próximo time `search`
em vez de redescobrir os limites de módulo e o modelo de dados a cada sessão.

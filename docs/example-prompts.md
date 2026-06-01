# 20 prompts para o dia a dia do memory-team

Prompts prontos para colar no **lead** (no `claude`, dentro de um projeto). Cada um exercita o
agent team + o vault central de memória. Troque as partes entre `<colchetes>`.
Os prompts estão em inglês (o time opera em inglês); a **explicação de cada um está em português**:
diz **o que o prompt faz** e **como usa o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez por projeto para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).

---

## A. Começando

### 1. Subir o time completo
> Create an agent team named `memory-team` with `researcher`, `executor`, `reviewer`, and `librarian`. Before anything, each one reads the relevant memory (`search` + the project `_index.md` + its own state note). Talk to each other via `SendMessage`, log decisions on the board, and write one atomic note per deliverable with `--task <id>`. At the end, the `librarian` runs `index`.

**O que faz:** sobe as quatro roles em modo peer, força um passo de *ler antes de agir* contra o vault
e define o contrato de colaboração (mailbox + mural + notas atômicas). É a abertura padrão para
qualquer sessão não trivial.

### 2. Teste de fumaça com dois agentes
> Create an agent team `memory-team` with just `researcher` and `reviewer`. The researcher finds one short fact about this repo, saves it (`save memory … --agent researcher --task <id>`), and `SendMessage`s it to the reviewer, who challenges it and saves a `learning`. They must exchange at least one direct message and log it on the board.

**O que faz:** a verificação mínima de ponta a ponta — confirma que os teammates sobem, conversam
peer-to-peer e que as notas chegam ao vault com frontmatter válido. Use na primeira vez numa máquina nova.

### 3. Habilitar a imposição de memória no projeto
> Run `node "<home>/.claude/memory-team/memory.mjs" enable` in this project, confirm `where` shows it as enabled, then summarize what the hooks will now enforce.

**O que faz:** escreve o marcador `.memory-team` para que o `TaskCompleted` bloqueie fechar tarefa sem
nota e o `TeammateIdle` bloqueie ficar ocioso sem flush de estado — ligando a disciplina para trabalho real.

### 4. Recuperar contexto após reiniciar
> The team was stopped. Re-create `memory-team` and, before doing anything, have every teammate run `search` for the topics in the project `_index.md` and read their own state note, then report what was already decided and what is still open.

**O que faz:** reconstrói o contexto perdido apenas a partir do vault — a prova de que a memória sobrevive
mesmo sem o agent teams ter retomada de sessão nativa.

---

## B. Desenvolvimento diário

### 5. Pesquisar → implementar uma feature
> Goal: add `<feature>`. The `researcher` gathers the existing patterns in this codebase and any external docs, saves findings as `memory` notes, and hands them to the `executor` via `SendMessage`. The `executor` implements it and records a `decision` note explaining the approach and trade-offs (with `--task <id>`).

**O que faz:** separa a descoberta da implementação para o executor nunca reinventar o que já é
conhecido; os dois passos deixam um rastro durável vinculado à tarefa.

### 6. Reproduzir e corrigir um bug
> Bug: `<describe>`. The `researcher` first searches the vault for prior notes about this area, then the `executor` reproduces it, fixes it, and saves a `learning` note with the root cause and the regression risk. The `reviewer` confirms the fix actually addresses the cause.

**O que faz:** começa perguntando "já vimos isso antes?", produz o fix e captura a causa raiz como
aprendizado para que a mesma classe de bug fique pesquisável na próxima vez.

### 7. Refatorar com rede de segurança
> Refactor `<module>` for clarity without changing behavior. The `executor` proposes the change and lists what could break; the `reviewer` plays devil's advocate against each claim before approving. Record the final rationale as a `decision` note.

**O que faz:** acopla a mudança a uma checagem adversarial, e a nota de decisão documenta *por que* a
refatoração foi segura — útil quando alguém revisitar isso meses depois.

### 8. Tarefa mobile (Expo)
> In this Expo/React Native app, implement `<screen/feature>`. The `researcher` checks our existing navigation/state patterns in the vault, the `executor` builds it, and notes any EAS/build implications as a `memory` note tagged `expo`.

**O que faz:** mantém o conhecimento específico de mobile (navegação, particularidades do EAS) se
acumulando sob o projeto, para o próximo trabalho mobile começar do que já deu certo.

### 9. Tarefa em Cloudflare Worker
> Add `<endpoint/binding>` to this Worker. The `executor` implements it and records the KV/secret/route decisions as a `decision` note tagged `cloudflare`; the `reviewer` checks for cold-start and limits issues.

**O que faz:** captura decisões de infra (bindings, rotas, limites) que são fáceis de esquecer e já
recebe uma revisão dos pontos críticos de Worker.

### 10. Planejar antes de construir
> Don't write code yet. The `researcher` and `reviewer` produce two competing plans for `<task>`, debate them via `SendMessage`, and the team records the chosen plan as a `decision` note with the rejected alternative noted for the record.

**O que faz:** uma rodada só de design; a nota de decisão preserva tanto o plano vencedor quanto a opção
descartada, para o raciocínio não se perder.

---

## C. Operações de memória

### 11. Consultar a memória antes de decidir
> Before we discuss `<topic>`, run `search <topic>` and `search <related-tag>` and summarize every relevant note (with its summary and tags) so we build on what we already know.

**O que faz:** um passo puro de *leitura* que dá pra usar até sem um time completo — traz à tona decisões
e aprendizados anteriores para você não contradizer trabalho passado.

### 12. Consolidar e indexar (librarian)
> `librarian`: review today's new notes, merge duplicates into single `decision` notes (keep the trail), fix the `related`/`[[wikilinks]]`, standardize the tags, and run `index`. Report any note missing a `summary`.

**O que faz:** a passada de curadoria que mantém o vault navegável — deduplica, conecta e regenera o
`_index.md` (MOC) do projeto e o índice mestre.

### 13. Busca entre projetos
> Run `search <term> --all` and tell me which other projects already solved something like `<problem>`, linking the notes.

**O que faz:** usa a partição por projeto + o espaço `global` para reaproveitar soluções entre *todos*
os seus repositórios, não só o atual.

### 14. Promover um aprendizado para global
> This insight applies to every project, not just this one. Save it with `--global` as a `learning` note, then have the `librarian` reindex.

**O que faz:** arquiva conhecimento transversal em `global/` para ele aparecer na busca de qualquer
projeto, transformando lições pontuais em regras reutilizáveis.

### 15. Integrar um projeto existente à memória
> This repo is new to the team. The `researcher` maps its architecture, key folders, and conventions and writes 3–5 atomic `memory` notes (one concept each, well tagged); the `librarian` indexes them so future sessions start informed.

**O que faz:** dá o pontapé inicial no vault de um projeto para que o próximo time que o abrir possa
`search` em vez de redescobrir a base de código.

---

## D. Qualidade e revisão

### 16. Revisão adversarial do diff
> `reviewer`: review the current changes adversarially — assume there is a bug until proven otherwise. For each finding, state the test that would prove it, message the `executor`, and record confirmed issues as `learning` notes.

**O que faz:** uma passada cética focada em desprovar a corretude; os problemas confirmados viram
aprendizados pesquisáveis em vez de sumirem no chat.

### 17. Revisão de segurança
> The `researcher` lists the trust boundaries and inputs of `<feature>`; the `reviewer` probes each for injection, authz, and secret-handling issues. Record findings as `decision`/`learning` notes tagged `security`.

**O que faz:** estrutura uma passada de segurança (mapear a superfície → sondá-la) e deixa um rastro
com tag que você pode auditar depois com `search security`.

### 18. Comparar abordagens (painel de juízes)
> Have three teammates each propose a different approach to `<problem>` (e.g. simplest, most scalable, most familiar to our stack). They critique each other via `SendMessage`, then the team records the winning approach and why, with the runners-up noted.

**O que faz:** gera opções diversas e as pontua via crítica entre pares antes de decidir — melhor do que
iterar na primeira ideia, e o raciocínio fica preservado.

---

## E. Encerramento e higiene

### 19. Flush de fim de sessão
> We're stopping. Every teammate writes/updates its `agents/<name>.md` state note (done / in progress / next step / open items), the `librarian` runs `index`, and you give me a 5-line summary of what's persisted.

**O que faz:** satisfaz o gate do `TeammateIdle` e garante que a próxima sessão consiga retomar a partir
do vault — o passo explícito de "salvar o jogo".

### 20. Retrospectiva semanal a partir do vault
> `librarian`: read this project's notes from the last week, then write one `learning` note summarizing the recurring decisions, mistakes, and patterns, and link the source notes.

**O que faz:** transforma as notas acumuladas em uma lição de nível mais alto, para a memória ficar
*mais* útil com o tempo, não apenas maior.

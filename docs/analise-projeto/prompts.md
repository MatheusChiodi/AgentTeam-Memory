# 18 prompts para análise do projeto X

Prompts prontos para colar no **lead** (no `claude`, dentro do `<projeto X>`). Cada um exercita o
agent team + o vault central de memória para **entender** o projeto e deixar esse entendimento
durável — não jogar a análise fora ao fim da sessão. Troque as partes entre `<colchetes>` (a começar
por `<project X>`). Os prompts estão em inglês (o time opera em inglês); a **explicação de cada um
está em português**: diz **o que o prompt faz** e **como usa o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez no `<projeto X>` para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).
> Toda análise começa com `search` (não redescobrir o já mapeado) e termina em notas atômicas indexadas.

---

## A. Arquitetura e base de código

### 1. Mapear a arquitetura
> Map the architecture of `<project X>`. The `researcher` first `search`es the vault and reads the `_index.md` so we don't re-map what's known, then identifies the main layers/modules, their responsibilities, and how they talk to each other, and writes 3–5 atomic `memory` notes (one concept each, well tagged) plus a Mermaid diagram. The `librarian` runs `index`.

**O que faz:** produz um mapa arquitetural durável em notas atômicas em vez de uma explicação
descartável; começa pelo vault para não repetir trabalho e fecha com indexação navegável.

### 2. Entender uma base de código nova
> `<project X>` is new to the team. The `researcher` explores it (entry points, build, key folders, conventions) and writes 3–5 atomic `memory` notes capturing what a newcomer must know; the `librarian` indexes them so future sessions start with `search` instead of rediscovery. Report the 5 things you'd tell a new developer.

**O que faz:** dá o pontapé de entendimento de um repo desconhecido e o converte em memória
pesquisável; o próximo time abre o `<projeto X>` já informado, sem reler tudo.

### 3. Mapear um módulo específico em profundidade
> Deep-dive `<module/folder>` in `<project X>`. The `researcher` `search`es prior notes about it, then documents its public surface, internal structure, key invariants, and the trickiest parts, saving a `memory` note (well tagged) with a Mermaid diagram of its internals. Flag anything surprising as a separate `learning` note.

**O que faz:** aprofunda em um módulo e captura sua superfície e armadilhas como nota durável;
surpresas viram `learning` separado, então o conhecimento fino não se dilui.

### 4. Reconstruir a intenção de design
> For `<project X>` (or `<area>`), the `researcher` reconstructs *why* it's built this way: `search` the vault for past `decision` notes, read the code, and infer the design intent and constraints. Record gaps where the rationale is unknown as `learning` notes so we can confirm them later.

**O que faz:** recupera a intenção de design cruzando decisões já registradas com o código; lacunas de
racional ficam marcadas como aprendizados a confirmar, em vez de viram suposição silenciosa.

---

## B. Saúde, dívida e dependências

### 5. Achar hotspots e dívida técnica
> Find the hotspots and technical debt in `<project X>`. The `researcher` identifies the most complex/most-changed/most-coupled areas and the riskiest code, ranks them by impact, and writes a `learning` note per significant hotspot (what, why risky, suggested direction). The `librarian` indexes them under a `tech-debt` tag.

**O que faz:** localiza onde o risco se concentra e o transforma em notas com tag `tech-debt`
priorizáveis; vira um backlog de análise pesquisável, não um desabafo no chat.

### 6. Análise de dependências
> Analyze the dependencies of `<project X>`. The `researcher` lists direct dependencies, their role, version risk (outdated/abandoned), and any duplication/overlap, and records a `memory` note with the dependency map. Flag anything that should be removed or bumped as a `learning` note.

**O que faz:** dá visibilidade da árvore de dependências e seus riscos; o mapa fica como nota durável
e candidatos a remover/atualizar viram aprendizados acionáveis.

### 7. Mapear acoplamento e fronteiras
> Map the coupling in `<project X>`: which modules depend on which, where the boundaries are, and where they leak. The `researcher` produces a dependency/coupling diagram (Mermaid) in a `memory` note and flags the worst cross-boundary leaks as `learning` notes. The `librarian` indexes them.

**O que faz:** revela onde as fronteiras vazam e o acoplamento dói, com diagrama durável; os piores
vazamentos ficam marcados para guiar futuras refatorações.

### 8. Análise de cobertura e pontos cegos de teste
> Analyze where `<project X>` is and isn't tested. The `researcher` maps which areas have tests, which critical paths have none, and where tests are shallow, recording a `learning` note with the biggest test blind spots ranked by risk. Don't write tests — just analyze and record.

**O que faz:** mapeia os pontos cegos de teste por risco sem escrever teste nenhum; o `learning` note
vira a lista priorizada do que cobrir primeiro quando houver tempo.

---

## C. Comportamento e dados

### 9. Mapear o fluxo de dados
> Trace the data flow of `<project X>` for `<a key operation/request>`: where data enters, how it's transformed, where it's stored, and what leaves. The `researcher` writes a `memory` note with a Mermaid sequence/flow diagram and tags the stores and external calls involved.

**O que faz:** segue um dado de ponta a ponta e o registra como diagrama de fluxo durável; expõe
transformações e armazenamentos que ler o código solto não deixaria óbvio.

### 10. Análise de performance
> Analyze the performance profile of `<project X>` for `<flow/endpoint>`. The `researcher` identifies the likely bottlenecks (N+1, large payloads, sync I/O, cold starts), reasons about cost, and records a `learning` note with the suspected hotspots and what to measure. The `reviewer` challenges each hypothesis.

**O que faz:** levanta hipóteses de gargalo e o que medir, com o reviewer contestando cada uma; o
`learning` note guarda as suspeitas para a validação de performance partir daí.

### 11. Análise de segurança da superfície
> Analyze the security surface of `<project X>`: the `researcher` lists the trust boundaries, inputs, authn/authz points, and secret handling, recording a `memory` note tagged `security` with the threat surface. The `reviewer` ranks the top risks. Don't exploit anything — map and rank only.

**O que faz:** mapeia a superfície de ameaça e ranqueia riscos sem explorar nada; a nota com tag
`security` vira a base auditável para uma futura validação de segurança.

### 12. Mapear estados e máquina de estados
> Map the states of `<feature/entity>` in `<project X>`: every state, the transitions, and the events that trigger them. The `researcher` writes a `memory` note with a Mermaid state diagram and flags any unreachable or dead-end state as a `learning` note.

**O que faz:** torna explícita a máquina de estados implícita no código, com diagrama durável; estados
mortos ou inalcançáveis ficam sinalizados como aprendizado.

---

## D. Impacto e decisão

### 13. Análise de impacto de uma mudança proposta
> Before changing `<thing>` in `<project X>`, analyze the blast radius. The `researcher` `search`es the vault and the code for everything that depends on it, lists the affected areas and risks, and records a `decision` note with the impact assessment. The `reviewer` challenges whether anything was missed.

**O que faz:** mede o raio de impacto de uma mudança antes de fazê-la, cruzando vault e código; a
`decision` note de impacto orienta o escopo seguro e o reviewer caça o que ficou de fora.

### 14. Comparar duas áreas / abordagens existentes
> In `<project X>`, compare how `<area A>` and `<area B>` solve `<similar problem>`. The `researcher` documents both approaches, their trade-offs, and which is the better pattern to standardize on, recording a `decision` note with the recommendation. The `reviewer` argues the opposite case before it's finalized.

**O que faz:** confronta duas soluções existentes para escolher um padrão a seguir; a `decision` note
guarda a recomendação e o reviewer força o contraditório antes de fechá-la.

### 15. Encontrar a causa raiz de um comportamento
> Investigate why `<observed behavior>` happens in `<project X>`. The `researcher` `search`es prior notes, traces the code path that produces it, and records a `learning` note with the root cause (not just the symptom) and where it lives. The `reviewer` confirms the causal chain holds.

**O que faz:** persegue a causa raiz de um comportamento, não o sintoma, e a registra com o caminho no
código; o reviewer valida a cadeia causal antes de virar aprendizado durável.

### 16. Auditar consistência de convenções
> Audit `<project X>` for convention consistency: naming, file layout, error handling, imports. The `researcher` lists where the code follows the project conventions and where it diverges, recording a `learning` note with the divergences ranked by how much they hurt. Don't fix — just analyze and record.

**O que faz:** mapeia onde o código foge das próprias convenções, ranqueado por incômodo, sem corrigir
nada; vira a lista priorizada para uma futura passada de padronização.

---

## E. Onboarding ao vault

### 17. Onboarding do projeto ao vault
> Onboard `<project X>` into the team memory. The `researcher` maps the architecture, key folders, conventions, and the 3–5 most important concepts, writing one atomic `memory` note per concept (well tagged, with `related` wikilinks). The `librarian` then runs `index` so future sessions start informed. Report the resulting note list.

**O que faz:** o pontapé padrão do vault de um projeto — converte o entendimento inicial em 3–5 notas
atômicas indexadas, exatamente o que faz a próxima sessão começar com `search` em vez de redescoberta.

### 18. Cross-check de análise entre projetos
> Run `search <pattern/problem> --all` and tell me which other projects already analyzed or solved something like `<problem>`, linking the notes. The `researcher` then notes for `<project X>` what's reusable from those, recording a `learning` note with the cross-project references via `[[wikilinks]]`.

**O que faz:** reaproveita análises de *outros* repositórios via partição por projeto + espaço
`global`; o que serve para o `<projeto X>` fica registrado com links cruzados, evitando reanálise.

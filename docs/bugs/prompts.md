# 20 prompts para caça a bugs conhecidos e desconhecidos

Prompts prontos para colar no **lead** (no `claude`, dentro de um projeto). Cada um usa o
agent team + o vault central de memória para encontrar, reproduzir, corrigir e *prevenir* bugs.
Os prompts estão em inglês (o time opera em inglês); a **explicação de cada um está em português**:
diz **o que o prompt faz** e **como usa o time e a memória**. Troque as partes entre `<colchetes>`.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez por projeto para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).
> Quase todo prompt começa com um `search` no vault — sempre pergunte "já vimos essa classe de bug antes?".

---

## A. Bugs conhecidos

### 1. Reproduzir antes de tocar em qualquer código
> Bug: `<describe symptom + how to trigger>`. Do not fix anything yet. The `researcher` first runs `search <area>` and `search <error-tag>` in the vault to see if we hit this class of bug before, then the `executor` builds the smallest reliable reproduction (exact steps, inputs, expected vs actual) and reports it via `SendMessage`. Record the repro as a `memory` note with `--task <id>` so the fix can be measured against it.

**O que faz:** trava a equipe num repro determinístico antes de mexer no código, e checa o vault por
ocorrências anteriores. A nota de repro vira a régua objetiva para comprovar que o fix funcionou.

### 2. Isolar a regressão com bisect
> A previously working behavior broke: `<describe>`. The `researcher` checks the vault for prior notes on `<area>`, then the `executor` bisects the history (or the change set) to find the first commit/change that introduced it, explaining *why* that change caused the symptom. Save a `learning` note with `--task <id>` naming the offending change and the mechanism.

**O que faz:** transforma "parou de funcionar" em uma causa concreta via bissecção e registra o
commit culpado + o mecanismo como aprendizado, para regressões parecidas serem reconhecidas na hora.

### 3. Corrigir atacando a causa raiz, não o sintoma
> Bug: `<describe>` (repro in note `<link>`). The `executor` proposes a fix that addresses the underlying cause — not a band-aid — and lists exactly which line of reasoning connects cause to symptom. The `reviewer` adversarially checks that the fix removes the cause (not just hides the symptom) before approval. Record the chosen fix and its rationale as a `decision` note with `--task <id>`.

**O que faz:** separa correção de causa raiz de remendo de sintoma e força uma checagem adversarial
do reviewer; a decisão registrada documenta *por que* aquele fix realmente resolve.

### 4. Escrever o teste de regressão primeiro
> For bug `<describe>`, the `executor` writes a failing regression test that captures the exact misbehavior, confirms it fails on the current code, then applies the fix until the test passes. The `reviewer` verifies the test would actually catch a reintroduction of the bug. Save a `learning` note with `--task <id>` linking the test and the root cause.

**O que faz:** garante que o bug não volte sem ser notado — o teste falha antes e passa depois do fix —
e amarra teste, causa raiz e tarefa numa nota pesquisável.

### 5. Confirmar o fix de ponta a ponta
> The fix for `<bug>` is in. The `reviewer` re-runs the original reproduction from note `<link>`, confirms the symptom is gone, and probes the surrounding area for fixes that merely shifted the bug elsewhere. If anything is off, message the `executor`; otherwise record a `learning` note with `--task <id>` confirming the fix and noting any residual risk.

**O que faz:** fecha o ciclo do bug conhecido confrontando o fix contra o repro original e procurando
efeitos colaterais; o aprendizado registra o que ficou resolvido e o risco remanescente.

### 6. Triagem de uma lista de bugs reportados
> Here are several reported bugs: `<list>`. The `researcher` runs `search` for each area in the vault, then the team triages them by severity and likely shared root cause, grouping any that smell like the same underlying defect. Record the triage as a `decision` note with `--task <id>` so we attack causes, not tickets.

**O que faz:** prioriza e agrupa bugs por causa provável (em vez de tratar cada ticket isolado),
consultando o vault para reaproveitar diagnósticos antigos; a decisão guia a ordem de ataque.

---

## B. Bugs desconhecidos (caça)

### 7. Varredura adversarial em busca de bugs latentes
> No specific bug reported. The `reviewer` audits `<module/area>` adversarially — assume there are latent bugs until proven otherwise. For each suspected defect, state the precise input/condition that would trigger it and the test that would prove it. The `researcher` first runs `search <area>` to surface known weak spots. Record each confirmed finding as a `learning` note with `--task <id>`.

**O que faz:** caça proativa: parte do princípio de que há bugs escondidos e exige um gatilho concreto
para cada suspeita, começando pelo histórico do vault; achados confirmados viram aprendizados.

### 8. Caça multi-lente (correctness, concorrência, edge cases, segurança, limites)
> Hunt for bugs in `<area>` through five separate lenses, one pass each: correctness/logic, concurrency/races, edge cases (empty/null/huge/unicode), security (injection/authz/secrets), and resource limits (memory/timeouts/rate). Assign lenses across teammates via `SendMessage`. After all passes, the `librarian` consolidates findings into `learning` notes tagged by lens with `--task <id>`.

**O que faz:** evita o ponto cego de olhar só uma dimensão — cada lente é uma passada dedicada,
distribuída entre os teammates, e os achados ficam taggeados por categoria para auditoria futura.

### 9. Loop-until-dry (caçar até esgotar)
> Run an iterative bug hunt on `<area>`: each round, teammates look for new defects not already in the vault (`search` first). Keep rounds going until `<N>` consecutive rounds produce zero new findings. Log each round's result via `SendMessage` and save every confirmed bug as a `learning` note with `--task <id>`; the `librarian` runs `index` at the end.

**O que faz:** continua a varredura até `<N>` rodadas seguidas sem achados novos, usando o vault para
não recontar o mesmo bug; dá um critério de parada objetivo em vez de "achei que já chega".

### 10. Verificação adversarial de cada achado (painel que tenta refutar)
> For each candidate bug found in `<area>`, three teammates independently try to *refute* it — argue it cannot actually happen, or is intended behavior, citing code/inputs. They debate via `SendMessage`; if a majority refutes a candidate, drop it as a false positive and note why. Survivors are recorded as `learning` notes with `--task <id>` and a concrete trigger.

**O que faz:** filtra falsos positivos colocando vários agentes para tentar derrubar cada suspeita;
só sobrevive o que resiste à refutação, e o motivo de cada descarte fica registrado.

### 11. Fuzzing dirigido por hipótese
> Pick `<function/endpoint>` and have the `researcher` enumerate input classes (boundary values, malformed payloads, extreme sizes, unexpected types/encodings). The `executor` exercises each class and reports which inputs cause crashes, wrong output, or hangs. Save reproducible failures as `memory` notes with `--task <id>` and the exact input.

**O que faz:** explora sistematicamente as bordas de entrada de uma função/endpoint procurando
quebras, registrando cada entrada que falha com o input exato para reprodução posterior.

### 12. Caçada de estados impossíveis e invariantes
> List the invariants that `<module>` is supposed to maintain (what must always/never be true). For each invariant, the team searches for a sequence of operations that violates it. The `reviewer` adversarially tries to reach each "impossible" state. Record any violation as a `learning` note with `--task <id>` describing the broken invariant.

**O que faz:** torna explícitas as invariantes do módulo e tenta quebrá-las — uma das formas mais
densas de achar bugs profundos; cada invariante violada vira aprendizado pesquisável.

### 13. Caça a races e ordering em código concorrente
> Audit `<async/concurrent area>` for race conditions, lost updates, and ordering assumptions. The `researcher` maps shared state and the operations that touch it; the `reviewer` constructs interleavings that would corrupt state or deadlock. Record each plausible race as a `learning` note tagged `concurrency` with `--task <id>` and the interleaving that triggers it.

**O que faz:** ataca a classe de bug mais difícil de reproduzir — concorrência — mapeando o estado
compartilhado e construindo intercalações que o corrompem; os achados ficam taggeados `concurrency`.

### 14. Caça a vazamentos e exaustão de recursos
> Hunt for resource issues in `<area>`: leaks (memory/handles/connections), unbounded growth, missing timeouts, and retry storms. The `executor` traces the lifecycle of each acquired resource to its release. Record any unbounded or unreleased path as a `learning` note tagged `resources` with `--task <id>`.

**O que faz:** rastreia o ciclo de vida de recursos (aberto → liberado) procurando vazamentos e
crescimento sem limite, que só estouram em produção; os achados ficam taggeados `resources`.

---

## C. Causa raiz e prevenção

### 15. Análise dos 5 porquês
> For confirmed bug `<describe>`, run a 5-whys analysis as a team: each "why" drilled one level deeper toward the true root cause (not the proximate trigger). The `reviewer` challenges each step so we don't stop too early. Record the full chain as a `learning` note with `--task <id>`, ending at a cause we can actually prevent.

**O que faz:** força a equipe a furar até a causa de verdade em vez de parar no sintoma imediato,
com o reviewer impedindo paradas precoces; a cadeia inteira fica registrada como aprendizado.

### 16. Mapear a classe de bug recorrente via vault
> Run `search <bug-type>` (and `--all` for cross-project) and pull every prior note about this kind of defect. The `librarian` clusters them into recurring bug classes and tells me which class keeps reappearing and where. Record the pattern as a `learning` note with `--task <id>`, linking the source notes.

**O que faz:** usa a busca no vault (inclusive entre projetos) para revelar qual *classe* de bug
volta sempre; agrupar as ocorrências mostra onde investir em prevenção em vez de apagar incêndios.

### 17. Registrar o padrão de bug como aprendizado pesquisável
> We just fixed `<bug>`. Distill it into a reusable `learning` note: the symptom signature, the root cause, the smell that precedes it, and the guard that prevents it. Tag it so a future `search <smell>` surfaces it before the bug recurs. Save with `--task <id>` and link related notes via `[[wikilinks]]`.

**O que faz:** converte um fix pontual em conhecimento reaproveitável — assinatura, causa, cheiro e
guarda — taggeado para que uma busca futura traga o aprendizado *antes* do bug reaparecer.

### 18. Procurar instâncias gêmeas do mesmo defeito
> We found bug `<describe>` in `<location>`. Search the codebase for the same anti-pattern elsewhere ("if it's wrong here, where else is it wrong?"). The `executor` lists every sibling occurrence; the `reviewer` confirms which are genuinely affected. Record the sweep as a `decision` note with `--task <id>` so we fix the whole class, not one instance.

**O que faz:** parte de um bug encontrado para varrer o código atrás de cópias do mesmo anti-padrão,
fechando a classe inteira de uma vez; a decisão documenta quais ocorrências eram reais.

### 19. Endurecer contra a próxima ocorrência
> For root cause `<cause>` from note `<link>`, the team proposes a structural prevention — an assertion, type, lint rule, test, or API change that makes this bug impossible (or loud) next time. The `reviewer` checks the guard can't be silently bypassed. Record the prevention as a `decision` note with `--task <id>`.

**O que faz:** vai além de corrigir e cria uma barreira estrutural (assert, tipo, lint, teste) que
torna o bug impossível ou ruidoso da próxima vez; o reviewer garante que a guarda não seja burlável.

### 20. Retrospectiva de bugs do período
> `librarian`: read this project's bug-related `learning` notes from the last `<period>`, then write one higher-level `learning` note summarizing the recurring root causes, the lenses that found the most bugs, and the prevention guards that stuck. Link the source notes and run `index`.

**O que faz:** consolida os aprendizados de bugs num panorama de nível mais alto — quais causas se
repetem, quais lentes rendem mais e quais prevenções funcionaram — deixando a memória mais útil com o tempo.

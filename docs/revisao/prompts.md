# 18 prompts para code review

Prompts prontos para colar no **lead** (no `claude`, dentro de um projeto) quando o trabalho é
**revisar**: ler um diff com ceticismo, auditar segurança e performance, checar convenções e cobertura,
e confirmar que um fix ataca a causa raiz. Cada um exercita o agent team + o vault central de memória.
Troque as partes entre `<colchetes>`.
Os prompts estão em inglês (o time opera em inglês); a **explicação de cada um está em português**:
diz **o que o prompt faz** e **como usa o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez por projeto para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).

---

## A. Revisão adversarial

### 1. Revisão adversarial do diff
> `reviewer`: review the current changes adversarially — assume there is a bug until proven otherwise. For each finding, state the test that would prove it, `SendMessage` the `executor`, and record confirmed issues as `learning` notes with `--task <id>`.

**O que faz:** uma passada cética focada em desprovar a corretude; cada achado vem com o teste que o
comprovaria, e os problemas confirmados viram aprendizados pesquisáveis em vez de sumirem no chat.

### 2. Revisão de PR completa
> Review PR `<#/branch>`. The `researcher` summarizes what the PR claims to do and pulls any related notes from the vault (`search <feature>`); the `reviewer` checks the diff against that claim, line by line, and lists must-fix vs. nice-to-have. Record the review verdict as a `learning` note tagged `review`.

**O que faz:** confronta o que o PR diz que faz com o que o diff realmente muda, usando o histórico do
vault como contexto, e separa bloqueadores de melhorias — deixando o veredito registrado.

### 3. Painel de revisores
> Have three teammates review the `<diff>` from different angles — correctness, security, and readability — independently, then reconcile their findings via `SendMessage` into a single prioritized list. Record the agreed blockers as `learning` notes.

**O que faz:** cobre o diff por três lentes em paralelo e depois consolida, pegando classes de problema
que um único revisor deixaria passar; só os bloqueadores acordados viram nota, evitando ruído.

### 4. Confirmar que o fix ataca a causa raiz
> A fix for `<bug>` is proposed. The `reviewer` checks whether it addresses the root cause or just the symptom: trace why the bug happened, and ask what other call site has the same flaw. Record the confirmed root cause and any sibling risks as a `learning` note.

**O que faz:** impede o fix de cobrir só o sintoma — força rastrear a origem e procurar a mesma falha em
outros lugares, e captura a causa raiz como aprendizado para a classe de bug ficar pesquisável.

## B. Segurança

### 5. Revisão de segurança do diff
> The `researcher` lists the trust boundaries and inputs touched by `<change>`; the `reviewer` probes each for injection, broken authz, and secret-handling issues. Record findings as `decision`/`learning` notes tagged `security` so they're auditable later with `search security`.

**O que faz:** estrutura a passada de segurança (mapear a superfície → sondá-la) e deixa um rastro com
tag, transformando achados de segurança em algo que você reauditará depois em vez de esquecer.

### 6. Caçar vazamento de segredos
> `reviewer`: scan the `<diff/files>` for secrets, hardcoded credentials, tokens, or `.env` values that could be committed or logged. For each hit, state the blast radius. Record confirmed exposures as a `learning` note tagged `security,secrets` — never paste the secret value into the note.

**O que faz:** procura especificamente credenciais e segredos no diff/logs e estima o impacto de cada um;
registra o achado sem nunca expor o valor, respeitando a regra de não vazar `.env` em respostas.

### 7. Revisão de autorização e controle de acesso
> For `<endpoint/feature>`, the `researcher` lists who should and shouldn't be able to call it; the `reviewer` checks the diff enforces exactly that (object-level authz, role checks, default-deny). Record any gap as a `learning` note tagged `security,authz`.

**O que faz:** verifica que cada caminho aplica a regra de acesso pretendida, incluindo authz a nível de
objeto e default-deny, e deixa registrado qualquer furo encontrado para reabrir depois.

## C. Performance

### 8. Revisão de performance do diff
> `reviewer`: review `<change>` for performance — hot paths, allocations, unnecessary re-renders, and N+1 queries. For each suspected cost, name how you'd measure it. Record confirmed regressions as a `learning` note tagged `performance`.

**O que faz:** olha o diff procurando custo escondido (N+1, re-render, alocação) e pede como medir cada
suspeita em vez de adivinhar; só o que se confirma vira aprendizado, ligado à forma de comprovar.

### 9. Custo de acesso a dados e queries
> The `researcher` lists every data access in `<change>` and its expected frequency; the `reviewer` flags missing indexes, full scans, over-fetching, and chatty round-trips. Record the findings as a `learning` note tagged `performance,data`.

**O que faz:** mapeia cada leitura/escrita e sua frequência para achar o gargalo de dados antes que ele
apareça em produção, e guarda o resultado com tag para cruzar com revisões futuras.

### 10. Orçamento de bundle / payload (frontend)
> For this web change, the `reviewer` checks the impact on bundle size and render cost: new heavy imports, lack of code-splitting, large payloads. The `researcher` checks the vault for our past bundle decisions. Record the verdict as a `learning` note tagged `performance,frontend`.

**O que faz:** trata peso de bundle e custo de render como item de revisão, comparando com decisões
anteriores no vault, para o frontend não engordar mudança a mudança sem ninguém notar.

## D. Legibilidade e convenções

### 11. Revisão de legibilidade / clean code
> `reviewer`: review `<change>` for readability only — naming, function length, nesting depth, dead code, and comments that explain *what* instead of *why*. Suggest concrete rewrites for the worst offenders. Record any recurring smell as a `learning` note tagged `cleancode`.

**O que faz:** uma passada focada só em clareza, com reescritas concretas para os piores trechos; smells
que se repetem viram aprendizado, para o padrão de qualidade subir ao longo do tempo.

### 12. Checagem de convenções do projeto
> Check `<change>` against this project's conventions: the `researcher` pulls the convention notes from the vault (`search conventions`) and the local `CLAUDE.md`; the `reviewer` lists every deviation (naming, indent, import grouping, file casing, commit style). Record persistent gaps as a `learning` note.

**O que faz:** confronta o diff com as convenções escritas (vault + `CLAUDE.md` local) em vez da memória
do revisor, listando cada desvio — e registra os que reincidem para virarem pauta de padronização.

### 13. Revisão de tratamento de erros
> `reviewer`: review error handling in `<change>` — swallowed exceptions, missing edge cases, unclear error messages, and failure paths that leave bad state. The `researcher` checks how we handled errors in similar code. Record gaps as a `learning` note tagged `errors`.

**O que faz:** procura erros engolidos, estados inconsistentes pós-falha e mensagens ruins, usando o
histórico do vault como referência, e deixa registrado o que faltou tratar.

### 14. Revisão da API pública / contrato
> For the public surface changed in `<diff>` (function signatures, props, endpoints, return shapes), the `reviewer` checks for breaking changes, inconsistent naming, and unclear contracts. Record any breaking change as a `decision` note tagged `api` so consumers can be warned.

**O que faz:** isola o que é superfície pública e marca quebras de contrato e inconsistências de nome; a
nota de decisão serve de aviso rastreável para quem consome a API.

## E. Testes

### 15. Revisão de cobertura de testes
> `reviewer`: for `<change>`, list what is tested vs. what should be — happy path, edge cases, error paths, and the regression that this change risks. Name the missing tests explicitly. Record the gap as a `learning` note tagged `tests`.

**O que faz:** avalia a cobertura pela ótica do risco (não pela porcentagem), nomeando os testes que
faltam, e registra a lacuna para ser fechada antes do merge.

### 16. Qualidade dos próprios testes
> The `reviewer` reviews the *tests* in `<diff>`, not the code: assertions that don't assert, mocked integration boundaries, flaky timing, and tests that pass even when the code is broken. Record any anti-pattern as a `learning` note tagged `tests`.

**O que faz:** vira a lente para os testes em si, pegando asserts vazios, mock de fronteira de integração
e flakiness — armadilhas que dão falsa confiança — e registra o anti-pattern para não se repetir.

### 17. Escrever o teste que prova o bug
> Before approving the fix for `<bug>`, the `executor` writes a failing test that reproduces it; the `reviewer` confirms the test fails before the fix and passes after. Record the test-first proof as a `learning` note linking the bug and the fix with `[[wikilinks]]`.

**O que faz:** exige um teste que falha antes e passa depois como prova objetiva do fix, e encadeia bug,
teste e correção via wikilink — fechando o ciclo de regressão de forma auditável.

## F. Fechamento da revisão

### 18. Consolidar achados e indexar (librarian)
> `librarian`: gather today's `review`/`security`/`performance` `learning` notes, merge duplicates into single notes (keep the trail), fix the `related`/`[[wikilinks]]` and tags, and run `index`. Report any review note missing a `summary` or a `--task` reference.

**O que faz:** a passada de curadoria que fecha o ciclo de revisão — deduplica os achados, conecta-os e
regenera o `_index.md`, garantindo que toda nota de revisão tenha summary e tarefa para ficar rastreável.

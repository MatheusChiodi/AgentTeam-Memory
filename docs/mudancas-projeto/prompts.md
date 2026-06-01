# 18 prompts para mudanças no projeto X

Prompts prontos para colar no **lead** (no `claude`, dentro do `<projeto X>`). Cada um exercita o
agent team + o vault central de memória para **alterar** o projeto com rastro durável. Troque as
partes entre `<colchetes>` (a começar por `<project X>`). Os prompts estão em inglês (o time opera
em inglês); a **explicação de cada um está em português**: diz **o que o prompt faz** e **como usa
o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez no `<projeto X>` para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).
> Toda mudança começa lendo o vault (`search`) e termina com uma `decision` note + checagem do `reviewer`.

---

## A. Features e comportamento

### 1. Pesquisar → implementar uma feature
> Goal: add `<feature>` to `<project X>`. First the `researcher` runs `search <feature>` and `search <related-tag>`, reads the project `_index.md`, and reports the existing patterns plus any prior decision in this area. Then the `executor` implements the feature reusing those patterns and records a `decision` note (`save decision … --agent executor --task <id>`) explaining the approach and trade-offs. Finally `SendMessage` the `reviewer` to validate it.

**O que faz:** separa descoberta de implementação para o executor nunca reinventar o que o vault já
sabe; a `decision` note vinculada à tarefa preserva o porquê e o reviewer fecha o ciclo.

### 2. Alterar comportamento existente
> In `<project X>`, change `<existing behavior>` to `<new behavior>`. The `researcher` first `search`es for why the current behavior exists (look for prior `decision`/`learning` notes) so we don't undo a deliberate choice. The `executor` then makes the minimal change, lists what callers/usages are affected, and saves a `decision` note that supersedes the old reasoning and links it via `[[wikilink]]`.

**O que faz:** evita reverter por engano uma decisão antiga ao exigir leitura do histórico antes de
mudar; a nova `decision` note aponta para a anterior, mantendo a linha do raciocínio rastreável.

### 3. Adicionar feature guiada por pesquisa externa
> Add `<feature>` to `<project X>` that depends on `<library/API/spec>`. The `researcher` gathers the relevant external docs and our existing conventions, saving findings as `memory` notes (well tagged) before any code. The `executor` implements against those notes and records a `decision` note with the chosen integration shape; the `reviewer` checks the docs were applied correctly.

**O que faz:** ancora a implementação em fontes externas verificadas em vez de suposições; as `memory`
notes da pesquisa ficam pesquisáveis para a próxima feature que tocar a mesma lib ou API.

### 4. Remover ou descontinuar funcionalidade
> In `<project X>`, remove `<feature/flag/endpoint>`. The `researcher` `search`es the vault and the codebase for everything that references it; the `executor` removes it and its dead paths, then saves a `decision` note recording what was removed, why, and the migration/cleanup left for callers. The `reviewer` confirms nothing live still depends on it.

**O que faz:** torna a remoção segura mapeando dependências antes de apagar e deixa uma `decision`
note explicando a descontinuação, para ninguém ressuscitar o código removido sem contexto.

### 5. Mudança guiada por feedback do usuário
> Matheus reports: `<observed problem / desired change>` in `<project X>`. The `researcher` reframes it into a concrete change and checks the vault for related context; the `executor` implements the smallest change that satisfies it and records a `decision` note tying the change back to the original feedback (with `--task <id>`). The `reviewer` validates it actually resolves the report.

**O que faz:** transforma um pedido informal em uma mudança rastreável e mínima; a `decision` note
liga a alteração ao motivo original, então o histórico explica *por que* o projeto mudou.

---

## B. Contratos, APIs e dados

### 6. Mudança de contrato/API
> Change the contract of `<endpoint/function/module>` in `<project X>` from `<old shape>` to `<new shape>`. The `researcher` lists every consumer of the current contract (vault + code). The `executor` updates the contract and all consumers in one cohesive change and records a `decision` note documenting the breaking-vs-compatible call and the rollout. The `reviewer` checks no consumer was missed.

**O que faz:** trata a mudança de contrato como uma unidade (produtor + consumidores) e documenta se
quebra compatibilidade; a `decision` note vira a referência para qualquer integração futura.

### 7. Mudança de schema (dados)
> In `<project X>`, change the `<table/collection/KV namespace>` schema: `<describe change>`. The `researcher` checks the vault for prior schema decisions and current read/write sites. The `executor` applies the schema change plus the code that touches it and records a `decision` note covering the migration path and backward-compatibility window. The `reviewer` probes for unmigrated data and broken reads.

**O que faz:** acopla a mudança de schema ao código que a lê/escreve e documenta a migração; a
`decision` note evita que mudanças futuras de schema esqueçam o histórico de compatibilidade.

### 8. Versionar uma API sem quebrar clientes
> Introduce `<v2>` of `<API/endpoint>` in `<project X>` while keeping `<v1>` working. The `researcher` documents the differences and which clients use which version; the `executor` adds the new version behind `<route/version marker>` and records a `decision` note with the deprecation plan for `<v1>`. The `reviewer` confirms `<v1>` behavior is unchanged.

**O que faz:** permite evoluir o contrato sem quebrar consumidores existentes e registra o plano de
deprecação como decisão, para a remoção do `<v1>` acontecer depois com contexto pleno.

### 9. Validação e tratamento de erros de um contrato
> Harden `<endpoint/function>` in `<project X>`: define the valid inputs, the error responses, and the edge cases. The `researcher` maps the current input handling; the `executor` adds the validation and error paths and records a `decision` note listing the rejected inputs and their responses. The `reviewer` adversarially tries inputs that should be rejected.

**O que faz:** formaliza fronteiras de entrada e erro de um contrato e documenta cada rejeição; o
reviewer sonda a superfície, e os casos confirmados ficam preservados na `decision` note.

---

## C. Migrações e dependências

### 10. Migrar uma biblioteca ou framework
> Migrate `<project X>` from `<old lib/framework>` to `<new lib/framework>`. The `researcher` produces a migration map (every usage site, behavioral differences, gotchas) as `memory` notes. The `executor` migrates in cohesive steps and records a `decision` note per non-obvious incompatibility resolved (with `--task <id>`). The `reviewer` checks behavior parity at the boundaries.

**O que faz:** transforma uma migração arriscada em passos mapeados e documentados; cada
incompatibilidade não óbvia vira uma nota durável para a próxima migração não tropeçar no mesmo ponto.

### 11. Migração de dados
> In `<project X>`, migrate data from `<old format/store>` to `<new format/store>`. The `researcher` documents the source shape, volume, and invariants; the `executor` writes the migration (idempotent, reversible where possible) and records a `decision` note with the rollback plan and the verification query. The `reviewer` validates a sample before and after.

**O que faz:** garante que a migração de dados seja documentada com plano de rollback e verificação; a
`decision` note guarda a query de validação para auditar o resultado depois.

### 12. Atualizar uma dependência (bump arriscado)
> Bump `<dependency>` from `<old>` to `<new>` in `<project X>`. The `researcher` reads the changelog/breaking changes and `search`es the vault for past issues with this dependency; the `executor` applies the bump and the needed adaptations and records a `learning` note about any surprise. The `reviewer` checks the affected features still behave.

**O que faz:** trata um bump como mudança real (lê breaking changes, consulta histórico) em vez de
upgrade cego; surpresas viram `learning` notes pesquisáveis no próximo bump.

### 13. Substituir um serviço ou integração externa
> Replace `<current service>` with `<new service>` in `<project X>` (e.g. provider, API, queue). The `researcher` maps the current integration surface (calls, auth, data exchanged); the `executor` swaps it behind the same internal boundary and records a `decision` note comparing the two and the cutover plan. The `reviewer` checks the boundary contract held.

**O que faz:** isola a troca de serviço atrás de uma fronteira interna estável e documenta a
comparação e o plano de cutover, para a substituição não vazar para o resto do `<projeto X>`.

---

## D. Integrações e infra

### 14. Integrar um novo serviço
> Integrate `<service/SDK/API>` into `<project X>`. The `researcher` gathers the auth model, rate limits, and the minimal surface we need, saving them as `memory` notes; the `executor` adds the integration and records a `decision` note with the secrets/config and failure handling chosen. The `reviewer` probes for unhandled failures and leaked secrets.

**O que faz:** captura o conhecimento da integração (auth, limites, falhas) como notas duráveis e
documenta a decisão de configuração; o reviewer checa segredos e caminhos de erro antes de fechar.

### 15. Mudança em Cloudflare Worker
> Apply `<change>` to this Worker in `<project X>` (`<route/binding/KV/secret>`). The `executor` makes the change and records a `decision` note tagged `cloudflare` with the KV/secret/route decisions; the `reviewer` checks cold-start, request limits, and binding scoping. The `researcher` first `search`es for prior Worker decisions in the vault.

**O que faz:** mantém decisões de infra de Worker (bindings, rotas, limites) acumulando sob o
`<projeto X>` e já recebe uma revisão dos pontos críticos típicos de Worker.

### 16. Mudança mobile (Expo) com implicação de build
> In this Expo/React Native `<project X>`, implement `<change>`. The `researcher` checks the vault for our navigation/state patterns; the `executor` builds it and records any EAS/build/native implication as a `memory` note tagged `expo`. The `reviewer` flags anything that would only break in a release build.

**O que faz:** acumula o conhecimento mobile (navegação, EAS, particularidades nativas) e antecipa
quebras que só apareceriam em build de release, não no `expo start`.

---

## E. Fechamento da mudança

### 17. Planejar a mudança antes de codar
> Don't write code yet. For the change `<describe>` in `<project X>`, the `researcher` and `reviewer` produce two competing plans, debate them via `SendMessage`, and the team records the chosen plan as a `decision` note with the rejected alternative noted for the record. The `executor` only starts after the plan is saved.

**O que faz:** uma rodada só de design antes de mexer no código; a `decision` note preserva o plano
escolhido e o descartado, para o raciocínio da mudança não se perder na implementação.

### 18. Fechar a mudança com checagem do reviewer
> The change `<describe>` is implemented in `<project X>`. The `reviewer` reviews the diff adversarially (assume a regression until proven otherwise), `SendMessage`s the `executor` for each finding, and only then the team finalizes the `decision` note and the `librarian` runs `index`. Give me a 5-line summary of what changed and what was persisted.

**O que faz:** garante que nenhuma mudança feche sem revisão adversarial e sem rastro indexado; a
`decision` note final + `index` deixam a alteração auditável e pesquisável na próxima sessão.

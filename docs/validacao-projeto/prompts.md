# 18 prompts para validação no projeto X

Prompts prontos para colar no **lead** (no `claude`, dentro do `<projeto X>`). Cada um exercita o
agent team + o vault central de memória para **provar** que uma mudança faz o que deveria —
observando comportamento real, não só lendo código. Troque as partes entre `<colchetes>` (a começar
por `<project X>`). Os prompts estão em inglês (o time opera em inglês); a **explicação de cada um
está em português**: diz **o que o prompt faz** e **como usa o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez no `<projeto X>` para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).
> Toda validação registra o veredito como `decision`/`learning` note vinculada à `--task <id>`.

---

## A. Validar a mudança

### 1. Validar que a mudança faz o que deveria
> Validate that `<change/feature>` in `<project X>` actually does what it should. The `researcher` first `search`es the vault for the acceptance criteria or the decision note behind it; the `reviewer` then exercises the real behavior (run it, trigger the path, observe the output) rather than just reading the code, and records the verdict as a `decision` note (pass/fail + evidence, `--task <id>`).

**O que faz:** força a validação a observar o comportamento real contra o critério já registrado; o
veredito com evidência fica como `decision` note pesquisável, não solto no chat.

### 2. Rodar e observar o app
> Run `<project X>` (`<dev/build command>`) and observe `<the flow/screen/endpoint>` end to end. The `reviewer` reports what actually happened versus what was expected, captures any console/runtime errors, and saves a `learning` note with the observed behavior and any gap. The `researcher` supplies the expected behavior from the vault.

**O que faz:** valida executando de verdade e comparando observado vs esperado; o que foi visto fica
registrado como `learning`, então a próxima sessão sabe o estado real do app sem re-rodar tudo.

### 3. Validar contra requisitos / critérios de aceitação
> Validate `<feature>` in `<project X>` against its acceptance criteria. The `researcher` pulls the criteria from the vault (or restates them if missing and saves them as a `memory` note). The `reviewer` checks each criterion against real behavior, marks pass/fail per item, and records a `decision` note with the per-criterion verdict.

**O que faz:** transforma critérios soltos em um checklist verificável item a item contra o
comportamento real; o veredito por critério vira uma `decision` note auditável.

### 4. Smoke test do caminho crítico
> Smoke-test `<project X>`: run it and exercise the `<critical happy-path flow>` once, end to end. The `reviewer` confirms it loads, the main action works, and nothing throws; saves a short `learning` note with the result. If it breaks, `SendMessage` the `executor` with the exact failing step.

**O que faz:** uma verificação rápida de que o caminho principal não está quebrado; o resultado fica
registrado e, se falhar, o executor recebe o passo exato em vez de "não funciona".

### 5. Validar correção de bug
> The bug `<describe>` was fixed in `<project X>`. The `reviewer` reproduces the original failing scenario and confirms it no longer happens, then tries one adjacent input to ensure the fix isn't superficial. Record a `learning` note with the reproduction steps and the confirmation (with `--task <id>`).

**O que faz:** valida o fix reencenando o cenário original e sondando uma variação próxima para
descartar correção superficial; os passos de reprodução ficam guardados para regressões futuras.

---

## B. Regressão e estabilidade

### 6. Validar ausência de regressão
> After `<change>` in `<project X>`, validate that `<related features>` still work. The `researcher` lists the at-risk areas from the vault (what historically broke nearby); the `reviewer` exercises each one and records a `decision` note: which still work, which regressed. `SendMessage` the `executor` for any regression.

**O que faz:** usa o histórico do vault para focar a regressão onde já quebrou antes, em vez de testar
tudo; o resultado por área fica registrado e regressões vão direto ao executor.

### 7. Validar casos de borda e entradas inválidas
> Validate the edge handling of `<feature/endpoint>` in `<project X>`. The `reviewer` feeds boundary and invalid inputs (empty, oversized, malformed, unauthorized) and observes the real responses, then records a `learning` note listing each input and whether it was handled correctly. The `researcher` supplies the expected handling from any prior decision note.

**O que faz:** valida fronteiras com entradas reais e compara contra o tratamento esperado já
decidido; cada caso observado fica pesquisável para a próxima mudança no mesmo ponto.

### 8. Validar estado e dados após a operação
> Validate that running `<operation>` in `<project X>` leaves `<store/state>` in the expected shape. The `reviewer` performs the operation and inspects the actual data/state before and after, recording a `decision` note with the observed before/after and whether invariants held. The `researcher` provides the invariants from the schema decision note.

**O que faz:** valida o efeito colateral real (dados/estado), não só o retorno; o antes/depois
observado e os invariantes ficam registrados, fechando a validação de uma mudança de dados.

### 9. Validar idempotência / repetição
> Validate that `<operation>` in `<project X>` is safe to run twice. The `reviewer` runs it, then runs it again on the same input, and observes whether the second run changes anything it shouldn't. Record a `learning` note with the observed behavior and any non-idempotent side effect found.

**O que faz:** prova (ou refuta) idempotência executando duas vezes e observando o efeito da segunda
chamada; qualquer efeito colateral indevido vira um aprendizado registrado.

---

## C. Build, deploy e contratos

### 10. Validar build e deploy
> Validate that `<project X>` builds and is deployable. The `reviewer` runs `<build command>`, confirms it completes without errors, inspects the output/bundle for obvious problems, and records a `decision` note with the build result and warnings. If it fails, `SendMessage` the `executor` with the exact error.

**O que faz:** valida o artefato de build de verdade (não só o dev server) e registra o resultado; um
build quebrado vai ao executor com o erro exato, não com "não buildou".

### 11. Validar contrato/API contra o consumidor
> Validate that `<endpoint/API>` in `<project X>` still matches what its consumers expect. The `researcher` pulls the contract decision note from the vault; the `reviewer` calls the endpoint with a real request, compares the actual response shape/status against the contract, and records a `decision` note: matches or drifted.

**O que faz:** valida o contrato com uma chamada real contra o shape registrado, detectando drift; o
veredito documentado evita que consumidores quebrem em silêncio.

### 12. Validar variáveis de ambiente e configuração
> Validate that `<project X>` has every required env var/binding/secret configured for `<environment>`. The `reviewer` lists what the code reads, checks each is present (without printing secret values), and records a `learning` note with what's set vs missing. `SendMessage` Matheus if a required value is missing.

**O que faz:** valida a configuração necessária sem expor segredos e registra o que está faltando; o
`learning` note vira o checklist de config do `<projeto X>` para o próximo ambiente.

### 13. Validar uma migração antes de promover
> A migration `<describe>` ran in `<project X>`. Before promoting, the `reviewer` validates a data sample before/after, confirms the rollback path works on a copy, and records a `decision` note with the verification result. The `researcher` provides the expected post-migration shape from the migration decision note.

**O que faz:** valida a migração no concreto (amostra + rollback) antes de promover; o resultado
documentado é o que autoriza (ou bloqueia) a promoção, com rastro.

---

## D. Validação adversarial

### 14. Validação adversarial do diff
> `reviewer`: validate the current diff in `<project X>` adversarially — assume there is a defect until proven otherwise. For each suspicion, state the concrete test that would expose it, run/observe it, and record confirmed defects as `learning` notes. `SendMessage` the `executor` with each confirmed issue.

**O que faz:** uma passada cética que tenta desprovar a corretude executando os testes que exporiam
falhas; defeitos confirmados viram `learning` notes em vez de sumirem no chat.

### 15. Validação de segurança da mudança
> Validate `<feature>` in `<project X>` for security. The `researcher` lists its trust boundaries and inputs (from the vault if mapped); the `reviewer` probes each for injection, authz bypass, and secret leakage by actually sending crafted inputs, and records findings as `decision`/`learning` notes tagged `security`.

**O que faz:** valida segurança sondando a superfície real com entradas elaboradas, não só inspeção; os
achados ficam com tag `security` para auditoria posterior via `search security`.

### 16. Validar performance / comportamento sob carga
> Validate that `<feature/endpoint>` in `<project X>` performs acceptably. The `reviewer` exercises it under `<repeated/concurrent/large input>`, observes timing and resource behavior, and records a `learning` note with the measured numbers and any degradation. The `researcher` supplies the expected budget from any prior note.

**O que faz:** valida desempenho medindo o comportamento real sob carga e compara com o orçamento
esperado; os números medidos ficam registrados como baseline para a próxima validação.

---

## E. Registro do veredito

### 17. Reconciliar veredito com a decisão original
> For `<change>` in `<project X>`, the `reviewer` compares the validation result against the original `decision` note that proposed it. If the change met its goal, link the validation `learning` note to the decision via `[[wikilink]]`; if it didn't, record why and `SendMessage` the `executor`. The `librarian` then runs `index`.

**O que faz:** fecha o laço entre o que foi *decidido* e o que foi *validado*, ligando as notas; o
índice atualizado deixa decisão e veredito conectados e pesquisáveis juntos.

### 18. Relatório de validação persistido
> Validation of `<change>` in `<project X>` is done. Summarize the verdict (what was tested, observed result, pass/fail, residual risk) and ensure it lives as a `decision`/`learning` note with `--task <id>`; the `librarian` runs `index`. Give me a 5-line summary of the verdict and where it's persisted.

**O que faz:** garante que o veredito de validação não fique só na conversa — vira nota vinculada à
tarefa e indexada, para a próxima sessão saber o que já foi validado e o risco residual.

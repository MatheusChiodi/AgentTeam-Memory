# 18 prompts para ajustes e melhorias

Prompts prontos para colar no **lead** (no `claude`, dentro de um projeto) quando o objetivo é
melhorar código que já existe: refatorar, otimizar, pagar dívida técnica, padronizar e atualizar.
Cada um exercita o agent team + o vault central de memória. Troque as partes entre `<colchetes>`.
Os prompts estão em inglês (o time opera em inglês); a **explicação de cada um está em português**:
diz **o que o prompt faz** e **como usa o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez por projeto para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).
> Em ajustes, o ponto-chave é registrar o **porquê** da mudança como `decision` note — o diff mostra o quê.

---

## A. Refatoração com rede de segurança

### 1. Refatorar sem mudar comportamento
> Refactor `<module>` for clarity without changing behavior. The `executor` proposes the change and lists what could break; the `reviewer` plays devil's advocate against each claim before approving. Record the final rationale as a `decision` note (`--task <id>`).

**O que faz:** acopla a mudança a uma checagem adversarial, e a nota de decisão documenta *por que* a refatoração foi segura — útil quando alguém revisitar isso meses depois.

### 2. Extrair e modularizar
> Break `<large file/function>` into smaller, cohesive pieces. The `researcher` checks the vault for the conventions this project already follows; the `executor` extracts, the `reviewer` confirms no public API changed. Save a `decision` note (`--task <id>`) on the new boundaries and why they were drawn there.

**O que faz:** alinha a modularização às convenções já registradas no vault e documenta as fronteiras escolhidas — o raciocínio de divisão que costuma se perder no diff.

### 3. Remover código morto com segurança
> Find and remove dead code in `<area>`. The `researcher` traces each candidate's usages first; the `reviewer` challenges every removal as potentially-still-used before it goes. Record what was removed and the evidence it was safe as a `decision` note (`--task <id>`).

**O que faz:** trata cada remoção como suspeita até prova em contrário, com o reviewer adversarial impedindo cortes precipitados, e deixa um registro auditável do que saiu e por quê era seguro.

### 4. Reduzir dívida técnica
> Triage the technical debt in `<area>`: the `researcher` searches the vault for previously-logged shortcuts and TODOs, lists them by cost/impact, and the `executor` pays back the top `<N>`. Each repayment gets a `decision` note (`--task <id>`) referencing the original shortcut.

**O que faz:** usa as notas de atalho já gravadas como backlog de dívida, prioriza pelo retorno e fecha o ciclo ligando cada quitação ao atalho original que a gerou.

---

## B. Performance e qualidade técnica

### 5. Melhorar performance com medição
> Improve the performance of `<feature/path>`. The `executor` measures first (state the baseline), changes one thing, measures again — no guessing. The `reviewer` checks the gain is real and didn't trade correctness. Record the before/after numbers and the winning change as a `decision` note (`--task <id>`).

**O que faz:** força otimização guiada por medição em vez de palpite, com validação de que o ganho é real, e preserva os números antes/depois na memória como evidência.

### 6. Caçar o gargalo
> Something in `<flow>` feels slow. The `researcher` searches the vault for prior performance notes on this area, then the `executor` profiles to find the actual bottleneck before touching anything. Save the root cause as a `learning` note (`--task <id>`) tagged `performance`, even if the fix comes later.

**O que faz:** começa perguntando "já investigamos isso?" e identifica o gargalo real via profiling antes de mexer; a causa raiz vira aprendizado pesquisável com tag, separado da correção.

### 7. Otimizar bundle / cold start
> Reduce the `<bundle size / Worker cold start / app startup>` of this project. The `executor` measures the baseline, applies one optimization at a time, and the `reviewer` checks nothing broke. Record each effective optimization as a `decision` note tagged `performance` (`--task <id>`).

**O que faz:** ataca métricas de inicialização/tamanho de forma incremental e medida, acumulando uma trilha de otimizações que funcionaram para reaproveitar em projetos da mesma stack.

### 8. Robustez e tratamento de erros
> Harden the error handling in `<module>`. The `researcher` lists the failure modes and inputs; the `executor` adds guards/fallbacks for each; the `reviewer` probes for the ones still uncovered. Record the failure modes addressed as a `learning` note (`--task <id>`).

**O que faz:** mapeia os modos de falha antes de blindar e usa o reviewer para encontrar o que ficou descoberto; os modos tratados ficam registrados para auditoria posterior.

---

## C. DX, UX e acessibilidade

### 9. Melhorar a developer experience
> Improve the DX of `<workflow/script/config>` — faster feedback, clearer errors, fewer manual steps. The `researcher` checks the vault for past DX pain points; the `executor` implements the improvement and records what changed and the friction it removed as a `decision` note tagged `dx` (`--task <id>`).

**O que faz:** trata atrito de desenvolvimento como problema de primeira classe, parte do que já foi anotado como dor e registra a fricção removida — útil para o próximo time medir o ganho.

### 10. Melhorar acessibilidade
> Audit `<screen/component>` for accessibility (semantics, keyboard nav, contrast, labels, focus order). The `researcher` lists the issues against WCAG; the `executor` fixes them; the `reviewer` verifies each fix. Record the issues and fixes as a `decision` note tagged `a11y` (`--task <id>`).

**O que faz:** estrutura uma passada de acessibilidade (auditar contra critérios → corrigir → verificar) e deixa um rastro com tag `a11y` que dá para auditar depois com `search a11y`.

### 11. Refinar UX de um fluxo
> Smooth the UX of `<flow>`: fewer steps, better feedback, clearer states (loading/empty/error). The `researcher` and `reviewer` critique the current flow via `SendMessage`; the `executor` applies the agreed changes and records the UX rationale as a `decision` note tagged `ux` (`--task <id>`).

**O que faz:** submete o fluxo a uma crítica entre pares antes de mexer e preserva o raciocínio de UX por trás das mudanças — o tipo de decisão que some se ficar só no diff.

### 12. Melhorar mensagens e estados de UI
> Improve the empty/loading/error states and user-facing copy in `<area>`. The `executor` makes them consistent and helpful; the `reviewer` checks tone and edge cases. Save the patterns chosen (when to show what) as a `memory` note (`--task <id>`) so future screens reuse them.

**O que faz:** padroniza os estados de UI e o texto, e arquiva os padrões escolhidos como memória reutilizável para que telas futuras não reinventem a mesma decisão.

---

## D. Padronização e convenções

### 13. Alinhar às convenções do projeto
> Bring `<file/module>` in line with this project's conventions (naming, imports order, indentation, structure). The `researcher` pulls the conventions from the vault and `CLAUDE.md`; the `executor` applies them. Record any convention that was ambiguous and how we resolved it as a `decision` note (`--task <id>`).

**O que faz:** padroniza o código contra as convenções já documentadas e captura ambiguidades resolvidas como decisão — virando regra explícita o que antes era implícito.

### 14. Padronizar um padrão entre arquivos
> Standardize how we do `<pattern: error handling / data fetching / state, etc.>` across `<area>`. The `researcher` finds the variants in use, the team picks one, the `executor` migrates the rest to it. Record the chosen standard and the migration as a `decision` note (`--task <id>`).

**O que faz:** unifica variações divergentes de um mesmo padrão sob um único jeito acordado e registra o padrão escolhido para servir de referência canônica daqui pra frente.

### 15. Adicionar lint / formatação consistente
> Set up or tighten `<linter/formatter>` for this project and fix the violations in `<area>`. The `executor` applies the config and auto-fixes; the `reviewer` checks no logic changed in the noise. Record the rules adopted and any intentional exceptions as a `decision` note tagged `tooling` (`--task <id>`).

**O que faz:** mecaniza a consistência via tooling e separa as exceções deliberadas do ruído de formatação, deixando-as documentadas para não serem questionadas depois.

---

## E. Dependências e melhorias incrementais

### 16. Atualizar dependências com checagem de breaking changes
> Update `<dependency>` (or outdated deps in general). The `researcher` reads the changelog/migration guide and lists the breaking changes that affect us; the `executor` applies the update and migrations; the `reviewer` checks the affected call sites. Record the breaking changes handled as a `learning` note tagged `deps` (`--task <id>`).

**O que faz:** trata atualização como tarefa de risco — lê breaking changes antes, migra, verifica os pontos afetados — e arquiva o que mudou como aprendizado para a próxima atualização da mesma lib.

### 17. Pequenas melhorias incrementais
> Low-risk cleanup pass over `<area>`: rename for clarity, simplify conditionals, remove duplication — small, safe steps only. The `executor` does them in a tight loop; the `reviewer` confirms behavior is unchanged. Save one `memory` note (`--task <id>`) summarizing the cleanups, no note per tiny change.

**O que faz:** permite um ciclo rápido de melhorias seguras sem sobrecarga de memória por mudança, consolidando tudo numa única nota — rastro proporcional ao tamanho do trabalho.

### 18. Registrar o porquê de uma melhoria
> We just improved `<area>`. Before moving on, the `executor` writes a `decision` note (`--task <id>`) capturing what changed, why it was worth doing, and what we deliberately chose not to do — then the `librarian` runs `index`.

**O que faz:** o passo de fechamento de qualquer ajuste — registra o motivo e o escopo deliberadamente deixado de fora, para que a melhoria não pareça arbitrária quando revisitada, e reindexa o vault.

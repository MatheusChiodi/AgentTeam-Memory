# 20 prompts para testes unitários (frontend + backend)

Prompts prontos para colar no **lead** (no `claude`, dentro de um projeto). Cada um exercita o
agent team + o vault central de memória para escrever, ampliar e manter testes unitários.
Troque as partes entre `<colchetes>`. Os prompts estão em inglês (o time opera em inglês); a
**explicação de cada um está em português**: diz **o que o prompt faz** e **como usa o time e a memória**.

> Lembrete: rode `node "<home>/.claude/memory-team/memory.mjs" enable` uma vez por projeto para
> os hooks passarem a impor a disciplina de memória ali (sem isso eles ficam fail-open, não bloqueiam).
> Anti-pattern do projeto: **nunca mockar o DB em teste de integração** — mocks de KV/DB ficam só no unitário.

---

## A. Frontend

### 1. Gerar testes para um componente existente
> Write unit tests for the `<Component>` component (React 19 + TS, React Testing Library + Vitest). The `researcher` first runs `search <Component>` and `search testing` to reuse our existing render helpers and conventions, then the `executor` writes tests covering the default render, each prop variant, and the empty/loading/error states. Save a `memory` note with `--task <id>` listing what is covered and the gaps left.

**O que faz:** parte de um componente já pronto e cobre render + variações de props + estados; o passo do
researcher evita duplicar helpers de render que já existem e a nota registra o que ficou de fora.

### 2. Testar interações de usuário
> Add interaction tests for `<Component>` using `@testing-library/user-event`. The `executor` covers clicks, typing, form submit, and keyboard navigation, asserting on visible behavior (not implementation details). The `reviewer` checks that every assertion would actually fail if the handler were removed. Record any flaky-async lesson as a `learning` note.

**O que faz:** foca no comportamento que o usuário vê (eventos, foco, submit) em vez de detalhes internos,
e a revisão garante que os testes realmente pegam regressões — falsos positivos viram aprendizado pesquisável.

### 3. Testar um hook customizado
> Write unit tests for the custom hook `<useHook>` with `renderHook` from React Testing Library. The `executor` covers the initial state, each state transition, and cleanup on unmount. Before writing, `search hooks` to follow how we already test hooks here; save a `memory` note describing the transitions covered.

**O que faz:** isola a lógica do hook com `renderHook`, cobrindo estado inicial, transições e limpeza;
consultar a memória mantém um padrão único de teste de hooks em todo o projeto.

### 4. Mockar fetch/API numa tela
> The component `<Component>` calls `<endpoint>`. Mock the network layer (MSW or a `vi.fn()` fetch) and test the loading, success, and failure paths. The `researcher` confirms in the vault which mocking approach we standardized on; the `executor` implements it and records a `decision` note if a new approach is introduced.

**O que faz:** cobre os três caminhos de uma chamada de rede sem tocar a API real; o researcher impede que
cada teste invente um jeito diferente de mockar, e mudanças de abordagem ficam registradas como decisão.

### 5. Snapshot só onde faz sentido
> Add a snapshot test for `<Component>` only if its markup is stable and presentational; otherwise explain why a snapshot would be brittle and write explicit assertions instead. The `reviewer` challenges any snapshot that locks in volatile output. Note the rule applied as a `learning`.

**O que faz:** usa snapshot de forma criteriosa (só UI estável/apresentacional) e força justificar o
contrário; o aprendizado evita que o time encha o repo de snapshots frágeis no futuro.

### 6. Acessibilidade básica nos testes
> Add basic accessibility assertions to the tests for `<Component>`: query by role/label (not by test-id), assert focus order, and check `aria-*` on interactive elements. The `researcher` pulls any prior a11y note from the vault; save findings as a `memory` note tagged `a11y`.

**O que faz:** embute checagens de acessibilidade (roles, labels, foco, aria) nos testes unitários,
acumulando conhecimento de a11y sob a tag `a11y` para o próximo componente reaproveitar.

### 7. Testar componente React Native (Expo)
> In this Expo/React Native app, write tests for `<Component>` with `@testing-library/react-native` and Jest. The `researcher` checks the vault for our RN test setup (jest-expo preset, navigation/mocks); the `executor` covers render, props, and `onPress` interactions. Note any Expo-specific mock (e.g. `expo-router`) as a `memory` note tagged `expo`.

**O que faz:** trata as particularidades de testar RN/Expo (preset jest-expo, mocks de navegação) e mantém
esses mocks específicos de mobile pesquisáveis sob a tag `expo`.

### 8. Cobrir estados condicionais de render
> The component `<Component>` renders differently based on `<prop/condition>`. Enumerate every branch (logged-in vs out, empty list, error, permission denied, etc.) and write one focused test per branch. The `reviewer` confirms no branch is left untested. Save a `memory` note mapping branches to tests with `--task <id>`.

**O que faz:** mapeia explicitamente cada ramo de render condicional para um teste, e a revisão garante
cobertura total dos branches; o mapa branch→teste fica registrado na memória.

### 9. Testar componente de formulário e validação
> Write tests for the form `<Form>`: valid submit, each field-level validation error, disabled-while-submitting, and reset. The `executor` asserts on the messages shown to the user and on the submit payload. Record the validation rules covered as a `memory` note so future form changes can check against it.

**O que faz:** cobre o ciclo completo de um formulário (validação por campo, submit, estados, reset)
checando mensagem ao usuário e payload; a nota vira a referência das regras de validação testadas.

### 10. Migrar/padronizar o setup de testes frontend
> Set up (or align) the frontend test runner: Vitest + React Testing Library + jsdom, with a shared `setupTests` and a render-with-providers helper. The `researcher` checks the vault and `package.json` for the current config; the `executor` makes the minimal change and records the final setup as a `decision` note tagged `testing,setup`.

**O que faz:** estabelece ou alinha o runner (Vitest/RTL/jsdom) com helpers compartilhados, partindo do que
já existe; a decisão documenta a config final para todos os testes futuros seguirem o mesmo padrão.

---

## B. Backend

### 11. Testar um handler de Cloudflare Worker
> Write unit tests for the Worker handler at `<route>`. The `researcher` confirms our Worker test setup in the vault (Vitest + `@cloudflare/vitest-pool-workers` or `unstable_dev`); the `executor` tests the 200 path, input validation, and error responses, **mocking the KV binding in unit tests only**. Record the KV-mock shape as a `decision` note tagged `cloudflare,testing`.

**O que faz:** cobre status feliz, validação e erros de um handler de Worker mockando KV apenas no unitário
(respeitando o anti-pattern do projeto); a forma do mock de KV fica registrada como decisão reutilizável.

### 12. Testar validação de entrada e contratos
> For the endpoint `<endpoint>`, write tests that assert the input contract: required fields, type coercion, boundary values, and rejection of malformed payloads with the right status/shape. The `reviewer` adds at least one adversarial payload per field. Save a `memory` note documenting the contract that the tests now lock in.

**O que faz:** trava o contrato de entrada de um endpoint com casos válidos, limites e payloads malformados,
e a revisão acrescenta entradas adversariais; o contrato testado fica documentado na memória.

### 13. Casos de borda e caminhos de erro de um serviço
> The service `<service>` has these failure modes: `<list or "find them">`. The `researcher` searches the vault for prior incidents in this area; the `executor` writes tests for empty input, nulls, timeouts, and downstream failures, asserting the error is handled (not swallowed). Capture any newly found edge case as a `learning` note.

**O que faz:** sistematiza a cobertura de erros de um serviço (vazio, null, timeout, falha downstream)
checando que o erro é tratado e não engolido; novas bordas encontradas viram aprendizado pesquisável.

### 14. Testar funções puras / lógica de negócio
> Write exhaustive unit tests for the pure functions in `<module>` (no I/O). The `executor` uses table-driven cases covering normal, boundary, and invalid inputs, and adds property-style checks where useful. Since these are pure, no mocks are needed. Save a `memory` note listing the functions and their tested invariants.

**O que faz:** cobre lógica pura com casos tabelados (normal/limite/inválido) sem mocks, já que não há I/O;
a nota registra cada função e os invariantes garantidos pelos testes.

### 15. Mockar o repositório/DAO numa camada de serviço
> Unit-test the service `<service>` by mocking its repository/DAO so no real DB is touched (this is a **unit** test, not integration — integration tests must use a real DB). The `researcher` checks how we already structure these mocks; the `executor` verifies the service calls the repo with the right args and maps results/errors correctly. Record the mock convention as a `decision` note.

**O que faz:** testa a camada de serviço isolando o repositório com mock — explicitamente unitário, deixando
claro que integração usa DB real; a convenção de mock do repo fica registrada como decisão.

### 16. Testar handler Node.js (API/route)
> Write tests for the Node.js handler `<handler>` (Express/route or plain function). The `executor` tests success, 4xx validation, and 5xx error mapping, mocking only external dependencies (DB/clients), and asserts on status code + response body. Before starting, `search node testing` to reuse our request/response test helpers. Save a `memory` note with `--task <id>`.

**O que faz:** cobre os principais códigos de status de um handler Node mockando só dependências externas,
e reaproveita helpers de request/response já existentes via busca na memória.

### 17. Testar lógica Java/Oracle isolando o acesso a dados
> Write JUnit unit tests for `<class/method>` (Java + Oracle 11g context). The `executor` mocks the DAO/`ResultSet` layer (e.g. Mockito) so no Oracle connection is needed in the **unit** suite, and tests the business logic, SQL-mapping, and error handling. Note the mocking pattern as a `decision` note tagged `java,testing`.

**O que faz:** cobre regra de negócio Java sem conexão Oracle no unitário, mockando o DAO/ResultSet; mantém
o anti-pattern (DB real só em integração) e documenta o padrão de mock para o próximo teste Java.

---

## C. Cobertura e manutenção

### 18. Aumentar a cobertura de um módulo
> Raise test coverage for `<module>` toward `<target>%` without writing meaningless tests. The `researcher` runs the coverage tool and identifies the riskiest uncovered branches; the `executor` writes tests for those first, prioritizing logic over getters. Record the before/after coverage and the remaining gaps as a `memory` note with `--task <id>`.

**O que faz:** mira cobertura nos ramos mais arriscados primeiro (não em getters triviais) usando o
relatório de cobertura, e registra o antes/depois e as lacunas restantes para a próxima passada.

### 19. Teste de regressão para um bug corrigido
> A bug was just fixed: `<describe>`. The `researcher` searches the vault for the original `learning` note about this bug; the `executor` writes a regression test that fails on the old code and passes on the fix, and links it to that note. Save/update a `learning` note confirming the regression is now guarded.

**O que faz:** transforma um fix em teste de regressão que falharia no código antigo, amarrando-o ao
aprendizado original do bug — fechando o ciclo para a mesma classe de erro não voltar despercebida.

### 20. Registrar as convenções de teste como decisão
> Consolidate our unit-testing conventions for this project into one `decision` note: runner and config, folder/naming layout, mocking rules (KV/DB mocks only in unit, never in integration), what to snapshot, and coverage expectations. The `librarian` links it from the project `_index.md` and runs `index` so every future session starts from it.

**O que faz:** condensa as regras de teste do projeto numa única nota de decisão (runner, naming, regras de
mock, cobertura) e a indexa via librarian, virando a fonte de verdade que abre toda sessão futura de testes.

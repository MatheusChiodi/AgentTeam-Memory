# 20 prompts for unit tests (frontend + backend)

Ready-to-paste prompts for the **lead** (in `claude`, inside a project). Each one exercises the
agent team + the central memory vault to write, expand, and maintain unit tests.
Swap the parts between `<brackets>`. The prompts are in English (the team operates in English); the
**explanation of each one is in English**: it states **what the prompt does** and **how it uses the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once per project so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).
> Project anti-pattern: **never mock the DB in an integration test** — KV/DB mocks stay only in unit tests.

---

## A. Frontend

### 1. Generate tests for an existing component
> Write unit tests for the `<Component>` component (React 19 + TS, React Testing Library + Vitest). The `researcher` first runs `search <Component>` and `search testing` to reuse our existing render helpers and conventions, then the `executor` writes tests covering the default render, each prop variant, and the empty/loading/error states. Save a `memory` note with `--task <id>` listing what is covered and the gaps left.

**What it does:** starts from a ready-made component and covers render + prop variations + states; the
researcher step avoids duplicating render helpers that already exist and the note records what was left out.

### 2. Test user interactions
> Add interaction tests for `<Component>` using `@testing-library/user-event`. The `executor` covers clicks, typing, form submit, and keyboard navigation, asserting on visible behavior (not implementation details). The `reviewer` checks that every assertion would actually fail if the handler were removed. Record any flaky-async lesson as a `learning` note.

**What it does:** focuses on the behavior the user sees (events, focus, submit) instead of internal details,
and the review ensures the tests actually catch regressions — false positives become a searchable learning.

### 3. Test a custom hook
> Write unit tests for the custom hook `<useHook>` with `renderHook` from React Testing Library. The `executor` covers the initial state, each state transition, and cleanup on unmount. Before writing, `search hooks` to follow how we already test hooks here; save a `memory` note describing the transitions covered.

**What it does:** isolates the hook's logic with `renderHook`, covering initial state, transitions, and cleanup;
consulting the memory keeps a single hook-testing pattern across the whole project.

### 4. Mock fetch/API in a screen
> The component `<Component>` calls `<endpoint>`. Mock the network layer (MSW or a `vi.fn()` fetch) and test the loading, success, and failure paths. The `researcher` confirms in the vault which mocking approach we standardized on; the `executor` implements it and records a `decision` note if a new approach is introduced.

**What it does:** covers the three paths of a network call without touching the real API; the researcher prevents
each test from inventing a different way to mock, and approach changes are recorded as a decision.

### 5. Snapshot only where it makes sense
> Add a snapshot test for `<Component>` only if its markup is stable and presentational; otherwise explain why a snapshot would be brittle and write explicit assertions instead. The `reviewer` challenges any snapshot that locks in volatile output. Note the rule applied as a `learning`.

**What it does:** uses snapshots judiciously (only stable/presentational UI) and forces justifying the
opposite; the learning prevents the team from flooding the repo with brittle snapshots in the future.

### 6. Basic accessibility in the tests
> Add basic accessibility assertions to the tests for `<Component>`: query by role/label (not by test-id), assert focus order, and check `aria-*` on interactive elements. The `researcher` pulls any prior a11y note from the vault; save findings as a `memory` note tagged `a11y`.

**What it does:** embeds accessibility checks (roles, labels, focus, aria) into the unit tests,
accumulating a11y knowledge under the `a11y` tag for the next component to reuse.

### 7. Test a React Native component (Expo)
> In this Expo/React Native app, write tests for `<Component>` with `@testing-library/react-native` and Jest. The `researcher` checks the vault for our RN test setup (jest-expo preset, navigation/mocks); the `executor` covers render, props, and `onPress` interactions. Note any Expo-specific mock (e.g. `expo-router`) as a `memory` note tagged `expo`.

**What it does:** handles the particularities of testing RN/Expo (jest-expo preset, navigation mocks) and keeps
those mobile-specific mocks searchable under the `expo` tag.

### 8. Cover conditional render states
> The component `<Component>` renders differently based on `<prop/condition>`. Enumerate every branch (logged-in vs out, empty list, error, permission denied, etc.) and write one focused test per branch. The `reviewer` confirms no branch is left untested. Save a `memory` note mapping branches to tests with `--task <id>`.

**What it does:** explicitly maps each conditional-render branch to a test, and the review ensures
full branch coverage; the branch→test map is recorded in memory.

### 9. Test a form component and validation
> Write tests for the form `<Form>`: valid submit, each field-level validation error, disabled-while-submitting, and reset. The `executor` asserts on the messages shown to the user and on the submit payload. Record the validation rules covered as a `memory` note so future form changes can check against it.

**What it does:** covers the full cycle of a form (per-field validation, submit, states, reset)
checking the message to the user and the payload; the note becomes the reference for the validation rules tested.

### 10. Migrate/standardize the frontend test setup
> Set up (or align) the frontend test runner: Vitest + React Testing Library + jsdom, with a shared `setupTests` and a render-with-providers helper. The `researcher` checks the vault and `package.json` for the current config; the `executor` makes the minimal change and records the final setup as a `decision` note tagged `testing,setup`.

**What it does:** establishes or aligns the runner (Vitest/RTL/jsdom) with shared helpers, starting from what
already exists; the decision documents the final config for all future tests to follow the same pattern.

---

## B. Backend

### 11. Test a Cloudflare Worker handler
> Write unit tests for the Worker handler at `<route>`. The `researcher` confirms our Worker test setup in the vault (Vitest + `@cloudflare/vitest-pool-workers` or `unstable_dev`); the `executor` tests the 200 path, input validation, and error responses, **mocking the KV binding in unit tests only**. Record the KV-mock shape as a `decision` note tagged `cloudflare,testing`.

**What it does:** covers the happy status, validation, and errors of a Worker handler, mocking KV only in unit tests
(respecting the project anti-pattern); the KV-mock shape is recorded as a reusable decision.

### 12. Test input validation and contracts
> For the endpoint `<endpoint>`, write tests that assert the input contract: required fields, type coercion, boundary values, and rejection of malformed payloads with the right status/shape. The `reviewer` adds at least one adversarial payload per field. Save a `memory` note documenting the contract that the tests now lock in.

**What it does:** locks the input contract of an endpoint with valid cases, boundaries, and malformed payloads,
and the review adds adversarial inputs; the tested contract is documented in memory.

### 13. Edge cases and error paths of a service
> The service `<service>` has these failure modes: `<list or "find them">`. The `researcher` searches the vault for prior incidents in this area; the `executor` writes tests for empty input, nulls, timeouts, and downstream failures, asserting the error is handled (not swallowed). Capture any newly found edge case as a `learning` note.

**What it does:** systematizes the error coverage of a service (empty, null, timeout, downstream failure)
checking that the error is handled and not swallowed; newly found edges become a searchable learning.

### 14. Test pure functions / business logic
> Write exhaustive unit tests for the pure functions in `<module>` (no I/O). The `executor` uses table-driven cases covering normal, boundary, and invalid inputs, and adds property-style checks where useful. Since these are pure, no mocks are needed. Save a `memory` note listing the functions and their tested invariants.

**What it does:** covers pure logic with table-driven cases (normal/boundary/invalid) without mocks, since there's no I/O;
the note records each function and the invariants guaranteed by the tests.

### 15. Mock the repository/DAO in a service layer
> Unit-test the service `<service>` by mocking its repository/DAO so no real DB is touched (this is a **unit** test, not integration — integration tests must use a real DB). The `researcher` checks how we already structure these mocks; the `executor` verifies the service calls the repo with the right args and maps results/errors correctly. Record the mock convention as a `decision` note.

**What it does:** tests the service layer by isolating the repository with a mock — explicitly a unit test, making
clear that integration uses a real DB; the repo's mock convention is recorded as a decision.

### 16. Test a Node.js handler (API/route)
> Write tests for the Node.js handler `<handler>` (Express/route or plain function). The `executor` tests success, 4xx validation, and 5xx error mapping, mocking only external dependencies (DB/clients), and asserts on status code + response body. Before starting, `search node testing` to reuse our request/response test helpers. Save a `memory` note with `--task <id>`.

**What it does:** covers the main status codes of a Node handler, mocking only external dependencies,
and reuses existing request/response helpers via a memory search.

### 17. Test Java/Oracle logic by isolating the data access
> Write JUnit unit tests for `<class/method>` (Java + Oracle 11g context). The `executor` mocks the DAO/`ResultSet` layer (e.g. Mockito) so no Oracle connection is needed in the **unit** suite, and tests the business logic, SQL-mapping, and error handling. Note the mocking pattern as a `decision` note tagged `java,testing`.

**What it does:** covers Java business logic without an Oracle connection in unit tests, mocking the DAO/ResultSet; it keeps
the anti-pattern (real DB only in integration) and documents the mock pattern for the next Java test.

---

## C. Coverage and maintenance

### 18. Raise the coverage of a module
> Raise test coverage for `<module>` toward `<target>%` without writing meaningless tests. The `researcher` runs the coverage tool and identifies the riskiest uncovered branches; the `executor` writes tests for those first, prioritizing logic over getters. Record the before/after coverage and the remaining gaps as a `memory` note with `--task <id>`.

**What it does:** aims coverage at the riskiest branches first (not trivial getters) using the
coverage report, and records the before/after and the remaining gaps for the next pass.

### 19. Regression test for a fixed bug
> A bug was just fixed: `<describe>`. The `researcher` searches the vault for the original `learning` note about this bug; the `executor` writes a regression test that fails on the old code and passes on the fix, and links it to that note. Save/update a `learning` note confirming the regression is now guarded.

**What it does:** turns a fix into a regression test that would fail on the old code, tying it to the
original learning of the bug — closing the loop so the same error class doesn't come back unnoticed.

### 20. Record the testing conventions as a decision
> Consolidate our unit-testing conventions for this project into one `decision` note: runner and config, folder/naming layout, mocking rules (KV/DB mocks only in unit, never in integration), what to snapshot, and coverage expectations. The `librarian` links it from the project `_index.md` and runs `index` so every future session starts from it.

**What it does:** condenses the project's testing rules into a single decision note (runner, naming, mock rules,
coverage) and indexes it via the librarian, becoming the source of truth that opens every future testing session.

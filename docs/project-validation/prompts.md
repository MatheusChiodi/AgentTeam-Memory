# 18 prompts for validation in project X

Ready-to-paste prompts for the **lead** (in `claude`, inside `<project X>`). Each one exercises the
agent team + the central memory vault to **prove** that a change does what it should —
observing real behavior, not just reading code. Swap the parts between `<brackets>` (starting
with `<project X>`). The prompts are in English (the team operates in English); the **explanation of each one
is in English**: it states **what the prompt does** and **how it uses the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once in `<project X>` so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).
> Every validation records the verdict as a `decision`/`learning` note linked to the `--task <id>`.

---

## A. Validate the change

### 1. Validate that the change does what it should
> Validate that `<change/feature>` in `<project X>` actually does what it should. The `researcher` first `search`es the vault for the acceptance criteria or the decision note behind it; the `reviewer` then exercises the real behavior (run it, trigger the path, observe the output) rather than just reading the code, and records the verdict as a `decision` note (pass/fail + evidence, `--task <id>`).

**What it does:** forces the validation to observe the real behavior against the already-recorded criterion; the
verdict with evidence stays as a searchable `decision` note, not loose in the chat.

### 2. Run and observe the app
> Run `<project X>` (`<dev/build command>`) and observe `<the flow/screen/endpoint>` end to end. The `reviewer` reports what actually happened versus what was expected, captures any console/runtime errors, and saves a `learning` note with the observed behavior and any gap. The `researcher` supplies the expected behavior from the vault.

**What it does:** validates by actually running and comparing observed vs expected; what was seen stays
recorded as a `learning`, so the next session knows the real state of the app without re-running everything.

### 3. Validate against requirements / acceptance criteria
> Validate `<feature>` in `<project X>` against its acceptance criteria. The `researcher` pulls the criteria from the vault (or restates them if missing and saves them as a `memory` note). The `reviewer` checks each criterion against real behavior, marks pass/fail per item, and records a `decision` note with the per-criterion verdict.

**What it does:** turns loose criteria into a checklist verifiable item by item against the
real behavior; the per-criterion verdict becomes an auditable `decision` note.

### 4. Smoke test of the critical path
> Smoke-test `<project X>`: run it and exercise the `<critical happy-path flow>` once, end to end. The `reviewer` confirms it loads, the main action works, and nothing throws; saves a short `learning` note with the result. If it breaks, `SendMessage` the `executor` with the exact failing step.

**What it does:** a quick check that the main path isn't broken; the result stays
recorded and, if it fails, the executor gets the exact step instead of "it doesn't work".

### 5. Validate a bug fix
> The bug `<describe>` was fixed in `<project X>`. The `reviewer` reproduces the original failing scenario and confirms it no longer happens, then tries one adjacent input to ensure the fix isn't superficial. Record a `learning` note with the reproduction steps and the confirmation (with `--task <id>`).

**What it does:** validates the fix by re-enacting the original scenario and probing a nearby variation to
rule out a superficial fix; the reproduction steps stay saved for future regressions.

---

## B. Regression and stability

### 6. Validate the absence of regression
> After `<change>` in `<project X>`, validate that `<related features>` still work. The `researcher` lists the at-risk areas from the vault (what historically broke nearby); the `reviewer` exercises each one and records a `decision` note: which still work, which regressed. `SendMessage` the `executor` for any regression.

**What it does:** uses the vault's history to focus the regression where it broke before, instead of testing
everything; the per-area result is recorded and regressions go straight to the executor.

### 7. Validate edge cases and invalid inputs
> Validate the edge handling of `<feature/endpoint>` in `<project X>`. The `reviewer` feeds boundary and invalid inputs (empty, oversized, malformed, unauthorized) and observes the real responses, then records a `learning` note listing each input and whether it was handled correctly. The `researcher` supplies the expected handling from any prior decision note.

**What it does:** validates boundaries with real inputs and compares against the already-decided
expected handling; each observed case stays searchable for the next change at the same point.

### 8. Validate state and data after the operation
> Validate that running `<operation>` in `<project X>` leaves `<store/state>` in the expected shape. The `reviewer` performs the operation and inspects the actual data/state before and after, recording a `decision` note with the observed before/after and whether invariants held. The `researcher` provides the invariants from the schema decision note.

**What it does:** validates the real side effect (data/state), not just the return value; the observed
before/after and the invariants are recorded, closing the validation of a data change.

### 9. Validate idempotency / repetition
> Validate that `<operation>` in `<project X>` is safe to run twice. The `reviewer` runs it, then runs it again on the same input, and observes whether the second run changes anything it shouldn't. Record a `learning` note with the observed behavior and any non-idempotent side effect found.

**What it does:** proves (or refutes) idempotency by running twice and observing the effect of the second
call; any improper side effect becomes a recorded learning.

---

## C. Build, deploy, and contracts

### 10. Validate build and deploy
> Validate that `<project X>` builds and is deployable. The `reviewer` runs `<build command>`, confirms it completes without errors, inspects the output/bundle for obvious problems, and records a `decision` note with the build result and warnings. If it fails, `SendMessage` the `executor` with the exact error.

**What it does:** validates the build artifact for real (not just the dev server) and records the result; a
broken build goes to the executor with the exact error, not with "it didn't build".

### 11. Validate the contract/API against the consumer
> Validate that `<endpoint/API>` in `<project X>` still matches what its consumers expect. The `researcher` pulls the contract decision note from the vault; the `reviewer` calls the endpoint with a real request, compares the actual response shape/status against the contract, and records a `decision` note: matches or drifted.

**What it does:** validates the contract with a real call against the recorded shape, detecting drift; the
documented verdict prevents consumers from breaking silently.

### 12. Validate environment variables and configuration
> Validate that `<project X>` has every required env var/binding/secret configured for `<environment>`. The `reviewer` lists what the code reads, checks each is present (without printing secret values), and records a `learning` note with what's set vs missing. `SendMessage` Matheus if a required value is missing.

**What it does:** validates the required configuration without exposing secrets and records what's missing; the
`learning` note becomes the config checklist of `<project X>` for the next environment.

### 13. Validate a migration before promoting
> A migration `<describe>` ran in `<project X>`. Before promoting, the `reviewer` validates a data sample before/after, confirms the rollback path works on a copy, and records a `decision` note with the verification result. The `researcher` provides the expected post-migration shape from the migration decision note.

**What it does:** validates the migration concretely (sample + rollback) before promoting; the documented
result is what authorizes (or blocks) the promotion, with a trail.

---

## D. Adversarial validation

### 14. Adversarial validation of the diff
> `reviewer`: validate the current diff in `<project X>` adversarially — assume there is a defect until proven otherwise. For each suspicion, state the concrete test that would expose it, run/observe it, and record confirmed defects as `learning` notes. `SendMessage` the `executor` with each confirmed issue.

**What it does:** a skeptical pass that tries to disprove correctness by running the tests that would expose
failures; confirmed defects become `learning` notes instead of vanishing in the chat.

### 15. Security validation of the change
> Validate `<feature>` in `<project X>` for security. The `researcher` lists its trust boundaries and inputs (from the vault if mapped); the `reviewer` probes each for injection, authz bypass, and secret leakage by actually sending crafted inputs, and records findings as `decision`/`learning` notes tagged `security`.

**What it does:** validates security by probing the real surface with crafted inputs, not just inspection; the
findings stay tagged `security` for later audit via `search security`.

### 16. Validate performance / behavior under load
> Validate that `<feature/endpoint>` in `<project X>` performs acceptably. The `reviewer` exercises it under `<repeated/concurrent/large input>`, observes timing and resource behavior, and records a `learning` note with the measured numbers and any degradation. The `researcher` supplies the expected budget from any prior note.

**What it does:** validates performance by measuring the real behavior under load and comparing with the
expected budget; the measured numbers are recorded as a baseline for the next validation.

---

## E. Recording the verdict

### 17. Reconcile the verdict with the original decision
> For `<change>` in `<project X>`, the `reviewer` compares the validation result against the original `decision` note that proposed it. If the change met its goal, link the validation `learning` note to the decision via `[[wikilink]]`; if it didn't, record why and `SendMessage` the `executor`. The `librarian` then runs `index`.

**What it does:** closes the loop between what was *decided* and what was *validated*, linking the notes; the
updated index leaves decision and verdict connected and searchable together.

### 18. Persisted validation report
> Validation of `<change>` in `<project X>` is done. Summarize the verdict (what was tested, observed result, pass/fail, residual risk) and ensure it lives as a `decision`/`learning` note with `--task <id>`; the `librarian` runs `index`. Give me a 5-line summary of the verdict and where it's persisted.

**What it does:** ensures the validation verdict doesn't stay only in the conversation — it becomes a note linked to the
task and indexed, so the next session knows what has already been validated and the residual risk.

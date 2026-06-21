# 18 prompts for code review

Ready-to-paste prompts for the **lead** (in `claude`, inside a project) when the work is
**reviewing**: reading a diff skeptically, auditing security and performance, checking conventions and coverage,
and confirming that a fix attacks the root cause. Each one exercises the agent team + the central memory vault.
Swap the parts between `<brackets>`.
The prompts are in English (the team operates in English); the **explanation of each one is in English**:
it states **what the prompt does** and **how it uses the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once per project so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).

---

## A. Adversarial review

### 1. Adversarial review of the diff
> `reviewer`: review the current changes adversarially — assume there is a bug until proven otherwise. For each finding, state the test that would prove it, `SendMessage` the `executor`, and record confirmed issues as `learning` notes with `--task <id>`.

**What it does:** a skeptical pass focused on disproving correctness; each finding comes with the test that would
prove it, and the confirmed problems become searchable learnings instead of vanishing in the chat.

### 2. Full PR review
> Review PR `<#/branch>`. The `researcher` summarizes what the PR claims to do and pulls any related notes from the vault (`search <feature>`); the `reviewer` checks the diff against that claim, line by line, and lists must-fix vs. nice-to-have. Record the review verdict as a `learning` note tagged `review`.

**What it does:** confronts what the PR says it does with what the diff actually changes, using the vault's
history as context, and separates blockers from improvements — leaving the verdict recorded.

### 3. Panel of reviewers
> Have three teammates review the `<diff>` from different angles — correctness, security, and readability — independently, then reconcile their findings via `SendMessage` into a single prioritized list. Record the agreed blockers as `learning` notes.

**What it does:** covers the diff through three lenses in parallel and then consolidates, catching classes of problem
that a single reviewer would miss; only the agreed blockers become notes, avoiding noise.

### 4. Confirm the fix attacks the root cause
> A fix for `<bug>` is proposed. The `reviewer` checks whether it addresses the root cause or just the symptom: trace why the bug happened, and ask what other call site has the same flaw. Record the confirmed root cause and any sibling risks as a `learning` note.

**What it does:** prevents the fix from covering just the symptom — it forces tracing the origin and looking for the same flaw
elsewhere, and captures the root cause as a learning so the bug class stays searchable.

## B. Security

### 5. Security review of the diff
> The `researcher` lists the trust boundaries and inputs touched by `<change>`; the `reviewer` probes each for injection, broken authz, and secret-handling issues. Record findings as `decision`/`learning` notes tagged `security` so they're auditable later with `search security`.

**What it does:** structures the security pass (map the surface → probe it) and leaves a trail with a
tag, turning security findings into something you'll re-audit later instead of forgetting.

### 6. Hunt for secret leakage
> `reviewer`: scan the `<diff/files>` for secrets, hardcoded credentials, tokens, or `.env` values that could be committed or logged. For each hit, state the blast radius. Record confirmed exposures as a `learning` note tagged `security,secrets` — never paste the secret value into the note.

**What it does:** specifically looks for credentials and secrets in the diff/logs and estimates the impact of each;
it records the finding without ever exposing the value, respecting the rule of not leaking `.env` in responses.

### 7. Authorization and access-control review
> For `<endpoint/feature>`, the `researcher` lists who should and shouldn't be able to call it; the `reviewer` checks the diff enforces exactly that (object-level authz, role checks, default-deny). Record any gap as a `learning` note tagged `security,authz`.

**What it does:** verifies that each path applies the intended access rule, including object-level authz
and default-deny, and records any hole found so it can be reopened later.

## C. Performance

### 8. Performance review of the diff
> `reviewer`: review `<change>` for performance — hot paths, allocations, unnecessary re-renders, and N+1 queries. For each suspected cost, name how you'd measure it. Record confirmed regressions as a `learning` note tagged `performance`.

**What it does:** looks at the diff for hidden cost (N+1, re-render, allocation) and asks how to measure each
suspicion instead of guessing; only what's confirmed becomes a learning, tied to the way to prove it.

### 9. Cost of data access and queries
> The `researcher` lists every data access in `<change>` and its expected frequency; the `reviewer` flags missing indexes, full scans, over-fetching, and chatty round-trips. Record the findings as a `learning` note tagged `performance,data`.

**What it does:** maps each read/write and its frequency to find the data bottleneck before it
shows up in production, and keeps the result tagged to cross-reference with future reviews.

### 10. Bundle / payload budget (frontend)
> For this web change, the `reviewer` checks the impact on bundle size and render cost: new heavy imports, lack of code-splitting, large payloads. The `researcher` checks the vault for our past bundle decisions. Record the verdict as a `learning` note tagged `performance,frontend`.

**What it does:** treats bundle weight and render cost as a review item, comparing with prior decisions
in the vault, so the frontend doesn't bloat change by change without anyone noticing.

## D. Readability and conventions

### 11. Readability / clean-code review
> `reviewer`: review `<change>` for readability only — naming, function length, nesting depth, dead code, and comments that explain *what* instead of *why*. Suggest concrete rewrites for the worst offenders. Record any recurring smell as a `learning` note tagged `cleancode`.

**What it does:** a pass focused only on clarity, with concrete rewrites for the worst stretches; smells
that recur become a learning, so the quality bar rises over time.

### 12. Check project conventions
> Check `<change>` against this project's conventions: the `researcher` pulls the convention notes from the vault (`search conventions`) and the local `CLAUDE.md`; the `reviewer` lists every deviation (naming, indent, import grouping, file casing, commit style). Record persistent gaps as a `learning` note.

**What it does:** confronts the diff with the written conventions (vault + local `CLAUDE.md`) instead of the reviewer's
memory, listing each deviation — and records the recurring ones to become a standardization agenda item.

### 13. Error-handling review
> `reviewer`: review error handling in `<change>` — swallowed exceptions, missing edge cases, unclear error messages, and failure paths that leave bad state. The `researcher` checks how we handled errors in similar code. Record gaps as a `learning` note tagged `errors`.

**What it does:** looks for swallowed errors, inconsistent post-failure states, and bad messages, using the
vault's history as a reference, and records what was left unhandled.

### 14. Public API / contract review
> For the public surface changed in `<diff>` (function signatures, props, endpoints, return shapes), the `reviewer` checks for breaking changes, inconsistent naming, and unclear contracts. Record any breaking change as a `decision` note tagged `api` so consumers can be warned.

**What it does:** isolates what is public surface and flags contract breaks and naming inconsistencies; the
decision note serves as a traceable warning for whoever consumes the API.

## E. Tests

### 15. Test coverage review
> `reviewer`: for `<change>`, list what is tested vs. what should be — happy path, edge cases, error paths, and the regression that this change risks. Name the missing tests explicitly. Record the gap as a `learning` note tagged `tests`.

**What it does:** evaluates coverage through the lens of risk (not percentage), naming the tests that
are missing, and records the gap to be closed before the merge.

### 16. Quality of the tests themselves
> The `reviewer` reviews the *tests* in `<diff>`, not the code: assertions that don't assert, mocked integration boundaries, flaky timing, and tests that pass even when the code is broken. Record any anti-pattern as a `learning` note tagged `tests`.

**What it does:** turns the lens onto the tests themselves, catching empty asserts, mocked integration boundaries,
and flakiness — traps that give false confidence — and records the anti-pattern so it doesn't repeat.

### 17. Write the test that proves the bug
> Before approving the fix for `<bug>`, the `executor` writes a failing test that reproduces it; the `reviewer` confirms the test fails before the fix and passes after. Record the test-first proof as a `learning` note linking the bug and the fix with `[[wikilinks]]`.

**What it does:** requires a test that fails before and passes after as objective proof of the fix, and chains bug,
test, and fix via wikilink — closing the regression loop in an auditable way.

## F. Closing the review

### 18. Consolidate findings and index (librarian)
> `librarian`: gather today's `review`/`security`/`performance` `learning` notes, merge duplicates into single notes (keep the trail), fix the `related`/`[[wikilinks]]` and tags, and run `index`. Report any review note missing a `summary` or a `--task` reference.

**What it does:** the curation pass that closes the review loop — deduplicates the findings, connects them, and
regenerates the `_index.md`, ensuring every review note has a summary and task so it stays traceable.

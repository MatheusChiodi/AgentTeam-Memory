# 20 prompts for hunting known and unknown bugs

Ready-to-paste prompts for the **lead** (in `claude`, inside a project). Each one uses the
agent team + the central memory vault to find, reproduce, fix, and *prevent* bugs.
The prompts are in English (the team operates in English); the **explanation of each one is in English**:
it states **what the prompt does** and **how it uses the team and the memory**. Swap the parts between `<brackets>`.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once per project so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).
> Almost every prompt starts with a `search` in the vault — always ask "have we seen this class of bug before?".

---

## A. Known bugs

### 1. Reproduce before touching any code
> Bug: `<describe symptom + how to trigger>`. Do not fix anything yet. The `researcher` first runs `search <area>` and `search <error-tag>` in the vault to see if we hit this class of bug before, then the `executor` builds the smallest reliable reproduction (exact steps, inputs, expected vs actual) and reports it via `SendMessage`. Record the repro as a `memory` note with `--task <id>` so the fix can be measured against it.

**What it does:** locks the team into a deterministic repro before touching the code, and checks the vault for
prior occurrences. The repro note becomes the objective yardstick to prove the fix worked.

### 2. Isolate the regression with bisect
> A previously working behavior broke: `<describe>`. The `researcher` checks the vault for prior notes on `<area>`, then the `executor` bisects the history (or the change set) to find the first commit/change that introduced it, explaining *why* that change caused the symptom. Save a `learning` note with `--task <id>` naming the offending change and the mechanism.

**What it does:** turns "it stopped working" into a concrete cause via bisection and records the
guilty commit + the mechanism as a learning, so similar regressions are recognized on the spot.

### 3. Fix by attacking the root cause, not the symptom
> Bug: `<describe>` (repro in note `<link>`). The `executor` proposes a fix that addresses the underlying cause — not a band-aid — and lists exactly which line of reasoning connects cause to symptom. The `reviewer` adversarially checks that the fix removes the cause (not just hides the symptom) before approval. Record the chosen fix and its rationale as a `decision` note with `--task <id>`.

**What it does:** separates a root-cause fix from a symptom band-aid and forces an adversarial check
by the reviewer; the recorded decision documents *why* that fix actually resolves it.

### 4. Write the regression test first
> For bug `<describe>`, the `executor` writes a failing regression test that captures the exact misbehavior, confirms it fails on the current code, then applies the fix until the test passes. The `reviewer` verifies the test would actually catch a reintroduction of the bug. Save a `learning` note with `--task <id>` linking the test and the root cause.

**What it does:** ensures the bug doesn't come back unnoticed — the test fails before and passes after the fix —
and ties the test, root cause, and task into a searchable note.

### 5. Confirm the fix end to end
> The fix for `<bug>` is in. The `reviewer` re-runs the original reproduction from note `<link>`, confirms the symptom is gone, and probes the surrounding area for fixes that merely shifted the bug elsewhere. If anything is off, message the `executor`; otherwise record a `learning` note with `--task <id>` confirming the fix and noting any residual risk.

**What it does:** closes the known-bug loop by confronting the fix against the original repro and looking for
side effects; the learning records what was resolved and the remaining risk.

### 6. Triage a list of reported bugs
> Here are several reported bugs: `<list>`. The `researcher` runs `search` for each area in the vault, then the team triages them by severity and likely shared root cause, grouping any that smell like the same underlying defect. Record the triage as a `decision` note with `--task <id>` so we attack causes, not tickets.

**What it does:** prioritizes and groups bugs by likely cause (instead of treating each ticket in isolation),
consulting the vault to reuse old diagnoses; the decision guides the order of attack.

---

## B. Unknown bugs (hunt)

### 7. Adversarial sweep for latent bugs
> No specific bug reported. The `reviewer` audits `<module/area>` adversarially — assume there are latent bugs until proven otherwise. For each suspected defect, state the precise input/condition that would trigger it and the test that would prove it. The `researcher` first runs `search <area>` to surface known weak spots. Record each confirmed finding as a `learning` note with `--task <id>`.

**What it does:** proactive hunting: it assumes there are hidden bugs and demands a concrete trigger
for each suspicion, starting from the vault's history; confirmed findings become learnings.

### 8. Multi-lens hunt (correctness, concurrency, edge cases, security, limits)
> Hunt for bugs in `<area>` through five separate lenses, one pass each: correctness/logic, concurrency/races, edge cases (empty/null/huge/unicode), security (injection/authz/secrets), and resource limits (memory/timeouts/rate). Assign lenses across teammates via `SendMessage`. After all passes, the `librarian` consolidates findings into `learning` notes tagged by lens with `--task <id>`.

**What it does:** avoids the blind spot of looking at just one dimension — each lens is a dedicated pass,
distributed across the teammates, and the findings stay tagged by category for future audit.

### 9. Loop-until-dry (hunt until exhausted)
> Run an iterative bug hunt on `<area>`: each round, teammates look for new defects not already in the vault (`search` first). Keep rounds going until `<N>` consecutive rounds produce zero new findings. Log each round's result via `SendMessage` and save every confirmed bug as a `learning` note with `--task <id>`; the `librarian` runs `index` at the end.

**What it does:** continues the sweep until `<N>` consecutive rounds without new findings, using the vault to
avoid recounting the same bug; it gives an objective stopping criterion instead of "I think that's enough".

### 10. Adversarial verification of each finding (panel that tries to refute)
> For each candidate bug found in `<area>`, three teammates independently try to *refute* it — argue it cannot actually happen, or is intended behavior, citing code/inputs. They debate via `SendMessage`; if a majority refutes a candidate, drop it as a false positive and note why. Survivors are recorded as `learning` notes with `--task <id>` and a concrete trigger.

**What it does:** filters out false positives by having several agents try to knock down each suspicion;
only what resists refutation survives, and the reason for each discard is recorded.

### 11. Hypothesis-driven fuzzing
> Pick `<function/endpoint>` and have the `researcher` enumerate input classes (boundary values, malformed payloads, extreme sizes, unexpected types/encodings). The `executor` exercises each class and reports which inputs cause crashes, wrong output, or hangs. Save reproducible failures as `memory` notes with `--task <id>` and the exact input.

**What it does:** systematically explores the input edges of a function/endpoint looking for
breakages, recording each failing input with the exact input for later reproduction.

### 12. Hunt for impossible states and invariants
> List the invariants that `<module>` is supposed to maintain (what must always/never be true). For each invariant, the team searches for a sequence of operations that violates it. The `reviewer` adversarially tries to reach each "impossible" state. Record any violation as a `learning` note with `--task <id>` describing the broken invariant.

**What it does:** makes the module's invariants explicit and tries to break them — one of the densest
ways to find deep bugs; each violated invariant becomes a searchable learning.

### 13. Hunt for races and ordering in concurrent code
> Audit `<async/concurrent area>` for race conditions, lost updates, and ordering assumptions. The `researcher` maps shared state and the operations that touch it; the `reviewer` constructs interleavings that would corrupt state or deadlock. Record each plausible race as a `learning` note tagged `concurrency` with `--task <id>` and the interleaving that triggers it.

**What it does:** attacks the hardest-to-reproduce class of bug — concurrency — by mapping the shared
state and constructing interleavings that corrupt it; the findings stay tagged `concurrency`.

### 14. Hunt for leaks and resource exhaustion
> Hunt for resource issues in `<area>`: leaks (memory/handles/connections), unbounded growth, missing timeouts, and retry storms. The `executor` traces the lifecycle of each acquired resource to its release. Record any unbounded or unreleased path as a `learning` note tagged `resources` with `--task <id>`.

**What it does:** traces the lifecycle of resources (acquired → released) looking for leaks and
unbounded growth, which only blow up in production; the findings stay tagged `resources`.

---

## C. Root cause and prevention

### 15. 5-whys analysis
> For confirmed bug `<describe>`, run a 5-whys analysis as a team: each "why" drilled one level deeper toward the true root cause (not the proximate trigger). The `reviewer` challenges each step so we don't stop too early. Record the full chain as a `learning` note with `--task <id>`, ending at a cause we can actually prevent.

**What it does:** forces the team to drill down to the real cause instead of stopping at the immediate symptom,
with the reviewer preventing premature stops; the whole chain is recorded as a learning.

### 16. Map the recurring bug class via the vault
> Run `search <bug-type>` (and `--all` for cross-project) and pull every prior note about this kind of defect. The `librarian` clusters them into recurring bug classes and tells me which class keeps reappearing and where. Record the pattern as a `learning` note with `--task <id>`, linking the source notes.

**What it does:** uses the vault search (including cross-project) to reveal which *class* of bug
keeps coming back; grouping the occurrences shows where to invest in prevention instead of firefighting.

### 17. Record the bug pattern as a searchable learning
> We just fixed `<bug>`. Distill it into a reusable `learning` note: the symptom signature, the root cause, the smell that precedes it, and the guard that prevents it. Tag it so a future `search <smell>` surfaces it before the bug recurs. Save with `--task <id>` and link related notes via `[[wikilinks]]`.

**What it does:** converts a one-off fix into reusable knowledge — signature, cause, smell, and
guard — tagged so that a future search brings up the learning *before* the bug reappears.

### 18. Look for twin instances of the same defect
> We found bug `<describe>` in `<location>`. Search the codebase for the same anti-pattern elsewhere ("if it's wrong here, where else is it wrong?"). The `executor` lists every sibling occurrence; the `reviewer` confirms which are genuinely affected. Record the sweep as a `decision` note with `--task <id>` so we fix the whole class, not one instance.

**What it does:** starts from a found bug to sweep the code for copies of the same anti-pattern,
closing the whole class at once; the decision documents which occurrences were real.

### 19. Harden against the next occurrence
> For root cause `<cause>` from note `<link>`, the team proposes a structural prevention — an assertion, type, lint rule, test, or API change that makes this bug impossible (or loud) next time. The `reviewer` checks the guard can't be silently bypassed. Record the prevention as a `decision` note with `--task <id>`.

**What it does:** goes beyond fixing and creates a structural barrier (assert, type, lint, test) that
makes the bug impossible or loud next time; the reviewer ensures the guard can't be bypassed.

### 20. Retrospective of the period's bugs
> `librarian`: read this project's bug-related `learning` notes from the last `<period>`, then write one higher-level `learning` note summarizing the recurring root causes, the lenses that found the most bugs, and the prevention guards that stuck. Link the source notes and run `index`.

**What it does:** consolidates the bug learnings into a higher-level overview — which causes
recur, which lenses yield the most, and which preventions worked — making the memory more useful over time.

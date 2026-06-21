# 18 prompts for tweaks and improvements

Ready-to-paste prompts for the **lead** (in `claude`, inside a project) when the goal is to
improve code that already exists: refactor, optimize, pay down technical debt, standardize, and update.
Each one exercises the agent team + the central memory vault. Swap the parts between `<brackets>`.
The prompts are in English (the team operates in English); the **explanation of each one is in English**:
it states **what the prompt does** and **how it uses the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once per project so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).
> In tweaks, the key point is to record the **why** of the change as a `decision` note — the diff shows the what.

---

## A. Refactoring with a safety net

### 1. Refactor without changing behavior
> Refactor `<module>` for clarity without changing behavior. The `executor` proposes the change and lists what could break; the `reviewer` plays devil's advocate against each claim before approving. Record the final rationale as a `decision` note (`--task <id>`).

**What it does:** couples the change to an adversarial check, and the decision note documents *why* the refactoring was safe — useful when someone revisits it months later.

### 2. Extract and modularize
> Break `<large file/function>` into smaller, cohesive pieces. The `researcher` checks the vault for the conventions this project already follows; the `executor` extracts, the `reviewer` confirms no public API changed. Save a `decision` note (`--task <id>`) on the new boundaries and why they were drawn there.

**What it does:** aligns the modularization with the conventions already recorded in the vault and documents the chosen boundaries — the splitting rationale that usually gets lost in the diff.

### 3. Remove dead code safely
> Find and remove dead code in `<area>`. The `researcher` traces each candidate's usages first; the `reviewer` challenges every removal as potentially-still-used before it goes. Record what was removed and the evidence it was safe as a `decision` note (`--task <id>`).

**What it does:** treats each removal as suspect until proven otherwise, with the adversarial reviewer preventing rushed cuts, and leaves an auditable record of what was removed and why it was safe.

### 4. Reduce technical debt
> Triage the technical debt in `<area>`: the `researcher` searches the vault for previously-logged shortcuts and TODOs, lists them by cost/impact, and the `executor` pays back the top `<N>`. Each repayment gets a `decision` note (`--task <id>`) referencing the original shortcut.

**What it does:** uses the already-recorded shortcut notes as a debt backlog, prioritizes by return, and closes the loop by linking each repayment to the original shortcut that created it.

---

## B. Performance and technical quality

### 5. Improve performance with measurement
> Improve the performance of `<feature/path>`. The `executor` measures first (state the baseline), changes one thing, measures again — no guessing. The `reviewer` checks the gain is real and didn't trade correctness. Record the before/after numbers and the winning change as a `decision` note (`--task <id>`).

**What it does:** forces measurement-driven optimization instead of guesswork, with validation that the gain is real, and preserves the before/after numbers in memory as evidence.

### 6. Hunt the bottleneck
> Something in `<flow>` feels slow. The `researcher` searches the vault for prior performance notes on this area, then the `executor` profiles to find the actual bottleneck before touching anything. Save the root cause as a `learning` note (`--task <id>`) tagged `performance`, even if the fix comes later.

**What it does:** starts by asking "have we investigated this?" and identifies the real bottleneck via profiling before touching anything; the root cause becomes a searchable, tagged learning, separate from the fix.

### 7. Optimize bundle / cold start
> Reduce the `<bundle size / Worker cold start / app startup>` of this project. The `executor` measures the baseline, applies one optimization at a time, and the `reviewer` checks nothing broke. Record each effective optimization as a `decision` note tagged `performance` (`--task <id>`).

**What it does:** attacks startup/size metrics incrementally and measured, accumulating a trail of optimizations that worked to reuse in projects of the same stack.

### 8. Robustness and error handling
> Harden the error handling in `<module>`. The `researcher` lists the failure modes and inputs; the `executor` adds guards/fallbacks for each; the `reviewer` probes for the ones still uncovered. Record the failure modes addressed as a `learning` note (`--task <id>`).

**What it does:** maps the failure modes before hardening and uses the reviewer to find what was left uncovered; the handled modes are recorded for later audit.

---

## C. DX, UX, and accessibility

### 9. Improve developer experience
> Improve the DX of `<workflow/script/config>` — faster feedback, clearer errors, fewer manual steps. The `researcher` checks the vault for past DX pain points; the `executor` implements the improvement and records what changed and the friction it removed as a `decision` note tagged `dx` (`--task <id>`).

**What it does:** treats development friction as a first-class problem, starts from what was already noted as a pain point, and records the friction removed — useful for the next team to measure the gain.

### 10. Improve accessibility
> Audit `<screen/component>` for accessibility (semantics, keyboard nav, contrast, labels, focus order). The `researcher` lists the issues against WCAG; the `executor` fixes them; the `reviewer` verifies each fix. Record the issues and fixes as a `decision` note tagged `a11y` (`--task <id>`).

**What it does:** structures an accessibility pass (audit against criteria → fix → verify) and leaves a trail with the `a11y` tag that can be audited later with `search a11y`.

### 11. Refine the UX of a flow
> Smooth the UX of `<flow>`: fewer steps, better feedback, clearer states (loading/empty/error). The `researcher` and `reviewer` critique the current flow via `SendMessage`; the `executor` applies the agreed changes and records the UX rationale as a `decision` note tagged `ux` (`--task <id>`).

**What it does:** subjects the flow to a peer critique before touching it and preserves the UX rationale behind the changes — the kind of decision that disappears if it stays only in the diff.

### 12. Improve UI messages and states
> Improve the empty/loading/error states and user-facing copy in `<area>`. The `executor` makes them consistent and helpful; the `reviewer` checks tone and edge cases. Save the patterns chosen (when to show what) as a `memory` note (`--task <id>`) so future screens reuse them.

**What it does:** standardizes the UI states and the text, and archives the chosen patterns as reusable memory so future screens don't reinvent the same decision.

---

## D. Standardization and conventions

### 13. Align with the project conventions
> Bring `<file/module>` in line with this project's conventions (naming, imports order, indentation, structure). The `researcher` pulls the conventions from the vault and `CLAUDE.md`; the `executor` applies them. Record any convention that was ambiguous and how we resolved it as a `decision` note (`--task <id>`).

**What it does:** standardizes the code against the already-documented conventions and captures resolved ambiguities as a decision — turning what was implicit into an explicit rule.

### 14. Standardize a pattern across files
> Standardize how we do `<pattern: error handling / data fetching / state, etc.>` across `<area>`. The `researcher` finds the variants in use, the team picks one, the `executor` migrates the rest to it. Record the chosen standard and the migration as a `decision` note (`--task <id>`).

**What it does:** unifies divergent variations of the same pattern under a single agreed way and records the chosen standard to serve as the canonical reference from here on.

### 15. Add consistent linting / formatting
> Set up or tighten `<linter/formatter>` for this project and fix the violations in `<area>`. The `executor` applies the config and auto-fixes; the `reviewer` checks no logic changed in the noise. Record the rules adopted and any intentional exceptions as a `decision` note tagged `tooling` (`--task <id>`).

**What it does:** mechanizes consistency via tooling and separates the deliberate exceptions from the formatting noise, leaving them documented so they aren't questioned later.

---

## E. Dependencies and incremental improvements

### 16. Update dependencies with a breaking-changes check
> Update `<dependency>` (or outdated deps in general). The `researcher` reads the changelog/migration guide and lists the breaking changes that affect us; the `executor` applies the update and migrations; the `reviewer` checks the affected call sites. Record the breaking changes handled as a `learning` note tagged `deps` (`--task <id>`).

**What it does:** treats the update as a risky task — reads breaking changes first, migrates, verifies the affected points — and archives what changed as a learning for the next update of the same lib.

### 17. Small incremental improvements
> Low-risk cleanup pass over `<area>`: rename for clarity, simplify conditionals, remove duplication — small, safe steps only. The `executor` does them in a tight loop; the `reviewer` confirms behavior is unchanged. Save one `memory` note (`--task <id>`) summarizing the cleanups, no note per tiny change.

**What it does:** allows a fast cycle of safe improvements without memory overhead per change, consolidating everything into a single note — a trail proportional to the size of the work.

### 18. Record the why of an improvement
> We just improved `<area>`. Before moving on, the `executor` writes a `decision` note (`--task <id>`) capturing what changed, why it was worth doing, and what we deliberately chose not to do — then the `librarian` runs `index`.

**What it does:** the closing step of any tweak — records the reason and the scope deliberately left out, so the improvement doesn't look arbitrary when revisited, and reindexes the vault.

# 18 prompts for changes to project X

Ready-to-paste prompts for the **lead** (in `claude`, inside `<project X>`). Each one exercises the
agent team + the central memory vault to **change** the project with a durable trail. Swap the
parts between `<brackets>` (starting with `<project X>`). The prompts are in English (the team operates
in English); the **explanation of each one is in English**: it states **what the prompt does** and **how it uses
the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once in `<project X>` so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).
> Every change starts by reading the vault (`search`) and ends with a `decision` note + a `reviewer` check.

---

## A. Features and behavior

### 1. Research → implement a feature
> Goal: add `<feature>` to `<project X>`. First the `researcher` runs `search <feature>` and `search <related-tag>`, reads the project `_index.md`, and reports the existing patterns plus any prior decision in this area. Then the `executor` implements the feature reusing those patterns and records a `decision` note (`save decision … --agent executor --task <id>`) explaining the approach and trade-offs. Finally `SendMessage` the `reviewer` to validate it.

**What it does:** separates discovery from implementation so the executor never reinvents what the vault already
knows; the `decision` note linked to the task preserves the why and the reviewer closes the loop.

### 2. Change existing behavior
> In `<project X>`, change `<existing behavior>` to `<new behavior>`. The `researcher` first `search`es for why the current behavior exists (look for prior `decision`/`learning` notes) so we don't undo a deliberate choice. The `executor` then makes the minimal change, lists what callers/usages are affected, and saves a `decision` note that supersedes the old reasoning and links it via `[[wikilink]]`.

**What it does:** avoids mistakenly reverting an old decision by requiring a read of the history before
changing; the new `decision` note points to the previous one, keeping the line of reasoning traceable.

### 3. Add a feature guided by external research
> Add `<feature>` to `<project X>` that depends on `<library/API/spec>`. The `researcher` gathers the relevant external docs and our existing conventions, saving findings as `memory` notes (well tagged) before any code. The `executor` implements against those notes and records a `decision` note with the chosen integration shape; the `reviewer` checks the docs were applied correctly.

**What it does:** anchors the implementation in verified external sources instead of assumptions; the `memory`
notes from the research stay searchable for the next feature that touches the same lib or API.

### 4. Remove or deprecate functionality
> In `<project X>`, remove `<feature/flag/endpoint>`. The `researcher` `search`es the vault and the codebase for everything that references it; the `executor` removes it and its dead paths, then saves a `decision` note recording what was removed, why, and the migration/cleanup left for callers. The `reviewer` confirms nothing live still depends on it.

**What it does:** makes the removal safe by mapping dependencies before deleting and leaves a `decision`
note explaining the deprecation, so no one resurrects the removed code without context.

### 5. Change guided by user feedback
> Matheus reports: `<observed problem / desired change>` in `<project X>`. The `researcher` reframes it into a concrete change and checks the vault for related context; the `executor` implements the smallest change that satisfies it and records a `decision` note tying the change back to the original feedback (with `--task <id>`). The `reviewer` validates it actually resolves the report.

**What it does:** turns an informal request into a traceable, minimal change; the `decision` note
links the change to the original reason, so the history explains *why* the project changed.

---

## B. Contracts, APIs, and data

### 6. Contract/API change
> Change the contract of `<endpoint/function/module>` in `<project X>` from `<old shape>` to `<new shape>`. The `researcher` lists every consumer of the current contract (vault + code). The `executor` updates the contract and all consumers in one cohesive change and records a `decision` note documenting the breaking-vs-compatible call and the rollout. The `reviewer` checks no consumer was missed.

**What it does:** treats the contract change as a unit (producer + consumers) and documents whether it
breaks compatibility; the `decision` note becomes the reference for any future integration.

### 7. Schema change (data)
> In `<project X>`, change the `<table/collection/KV namespace>` schema: `<describe change>`. The `researcher` checks the vault for prior schema decisions and current read/write sites. The `executor` applies the schema change plus the code that touches it and records a `decision` note covering the migration path and backward-compatibility window. The `reviewer` probes for unmigrated data and broken reads.

**What it does:** couples the schema change to the code that reads/writes it and documents the migration; the
`decision` note prevents future schema changes from forgetting the compatibility history.

### 8. Version an API without breaking clients
> Introduce `<v2>` of `<API/endpoint>` in `<project X>` while keeping `<v1>` working. The `researcher` documents the differences and which clients use which version; the `executor` adds the new version behind `<route/version marker>` and records a `decision` note with the deprecation plan for `<v1>`. The `reviewer` confirms `<v1>` behavior is unchanged.

**What it does:** lets the contract evolve without breaking existing consumers and records the deprecation
plan as a decision, so the removal of `<v1>` happens later with full context.

### 9. Validation and error handling of a contract
> Harden `<endpoint/function>` in `<project X>`: define the valid inputs, the error responses, and the edge cases. The `researcher` maps the current input handling; the `executor` adds the validation and error paths and records a `decision` note listing the rejected inputs and their responses. The `reviewer` adversarially tries inputs that should be rejected.

**What it does:** formalizes the input and error boundaries of a contract and documents each rejection; the
reviewer probes the surface, and the confirmed cases are preserved in the `decision` note.

---

## C. Migrations and dependencies

### 10. Migrate a library or framework
> Migrate `<project X>` from `<old lib/framework>` to `<new lib/framework>`. The `researcher` produces a migration map (every usage site, behavioral differences, gotchas) as `memory` notes. The `executor` migrates in cohesive steps and records a `decision` note per non-obvious incompatibility resolved (with `--task <id>`). The `reviewer` checks behavior parity at the boundaries.

**What it does:** turns a risky migration into mapped, documented steps; each non-obvious
incompatibility becomes a durable note so the next migration doesn't trip over the same point.

### 11. Data migration
> In `<project X>`, migrate data from `<old format/store>` to `<new format/store>`. The `researcher` documents the source shape, volume, and invariants; the `executor` writes the migration (idempotent, reversible where possible) and records a `decision` note with the rollback plan and the verification query. The `reviewer` validates a sample before and after.

**What it does:** ensures the data migration is documented with a rollback plan and verification; the
`decision` note keeps the validation query to audit the result later.

### 12. Update a dependency (risky bump)
> Bump `<dependency>` from `<old>` to `<new>` in `<project X>`. The `researcher` reads the changelog/breaking changes and `search`es the vault for past issues with this dependency; the `executor` applies the bump and the needed adaptations and records a `learning` note about any surprise. The `reviewer` checks the affected features still behave.

**What it does:** treats a bump as a real change (reads breaking changes, consults the history) instead of a
blind upgrade; surprises become `learning` notes searchable on the next bump.

### 13. Replace a service or external integration
> Replace `<current service>` with `<new service>` in `<project X>` (e.g. provider, API, queue). The `researcher` maps the current integration surface (calls, auth, data exchanged); the `executor` swaps it behind the same internal boundary and records a `decision` note comparing the two and the cutover plan. The `reviewer` checks the boundary contract held.

**What it does:** isolates the service swap behind a stable internal boundary and documents the
comparison and the cutover plan, so the replacement doesn't leak into the rest of `<project X>`.

---

## D. Integrations and infra

### 14. Integrate a new service
> Integrate `<service/SDK/API>` into `<project X>`. The `researcher` gathers the auth model, rate limits, and the minimal surface we need, saving them as `memory` notes; the `executor` adds the integration and records a `decision` note with the secrets/config and failure handling chosen. The `reviewer` probes for unhandled failures and leaked secrets.

**What it does:** captures the integration knowledge (auth, limits, failures) as durable notes and
documents the configuration decision; the reviewer checks secrets and error paths before closing.

### 15. Cloudflare Worker change
> Apply `<change>` to this Worker in `<project X>` (`<route/binding/KV/secret>`). The `executor` makes the change and records a `decision` note tagged `cloudflare` with the KV/secret/route decisions; the `reviewer` checks cold-start, request limits, and binding scoping. The `researcher` first `search`es for prior Worker decisions in the vault.

**What it does:** keeps Worker infra decisions (bindings, routes, limits) accumulating under
`<project X>` and already gets a review of the points that are typically critical for a Worker.

### 16. Mobile change (Expo) with build implications
> In this Expo/React Native `<project X>`, implement `<change>`. The `researcher` checks the vault for our navigation/state patterns; the `executor` builds it and records any EAS/build/native implication as a `memory` note tagged `expo`. The `reviewer` flags anything that would only break in a release build.

**What it does:** accumulates the mobile knowledge (navigation, EAS, native particularities) and anticipates
breakages that would only appear in a release build, not in `expo start`.

---

## E. Closing the change

### 17. Plan the change before coding
> Don't write code yet. For the change `<describe>` in `<project X>`, the `researcher` and `reviewer` produce two competing plans, debate them via `SendMessage`, and the team records the chosen plan as a `decision` note with the rejected alternative noted for the record. The `executor` only starts after the plan is saved.

**What it does:** a design-only round before touching the code; the `decision` note preserves the chosen
plan and the discarded one, so the change's reasoning isn't lost in the implementation.

### 18. Close the change with a reviewer check
> The change `<describe>` is implemented in `<project X>`. The `reviewer` reviews the diff adversarially (assume a regression until proven otherwise), `SendMessage`s the `executor` for each finding, and only then the team finalizes the `decision` note and the `librarian` runs `index`. Give me a 5-line summary of what changed and what was persisted.

**What it does:** ensures no change closes without an adversarial review and an indexed trail; the
final `decision` note + `index` leave the change auditable and searchable in the next session.

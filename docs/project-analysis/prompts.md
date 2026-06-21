# 18 prompts for analyzing project X

Ready-to-paste prompts for the **lead** (in `claude`, inside `<project X>`). Each one exercises the
agent team + the central memory vault to **understand** the project and make that understanding
durable — not throw the analysis away at the end of the session. Swap the parts between `<brackets>` (starting
with `<project X>`). The prompts are in English (the team operates in English); the **explanation of each one
is in English**: it states **what the prompt does** and **how it uses the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once in `<project X>` so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).
> Every analysis starts with `search` (don't rediscover what's already mapped) and ends in indexed atomic notes.

---

## A. Architecture and codebase

### 1. Map the architecture
> Map the architecture of `<project X>`. The `researcher` first `search`es the vault and reads the `_index.md` so we don't re-map what's known, then identifies the main layers/modules, their responsibilities, and how they talk to each other, and writes 3–5 atomic `memory` notes (one concept each, well tagged) plus a Mermaid diagram. The `librarian` runs `index`.

**What it does:** produces a durable architectural map in atomic notes instead of a throwaway
explanation; it starts from the vault to avoid repeating work and closes with a navigable index.

### 2. Understand a new codebase
> `<project X>` is new to the team. The `researcher` explores it (entry points, build, key folders, conventions) and writes 3–5 atomic `memory` notes capturing what a newcomer must know; the `librarian` indexes them so future sessions start with `search` instead of rediscovery. Report the 5 things you'd tell a new developer.

**What it does:** kicks off the understanding of an unknown repo and converts it into searchable
memory; the next team opens `<project X>` already informed, without re-reading everything.

### 3. Map a specific module in depth
> Deep-dive `<module/folder>` in `<project X>`. The `researcher` `search`es prior notes about it, then documents its public surface, internal structure, key invariants, and the trickiest parts, saving a `memory` note (well tagged) with a Mermaid diagram of its internals. Flag anything surprising as a separate `learning` note.

**What it does:** dives deep into a module and captures its surface and traps as a durable note;
surprises become a separate `learning`, so the fine-grained knowledge isn't diluted.

### 4. Reconstruct the design intent
> For `<project X>` (or `<area>`), the `researcher` reconstructs *why* it's built this way: `search` the vault for past `decision` notes, read the code, and infer the design intent and constraints. Record gaps where the rationale is unknown as `learning` notes so we can confirm them later.

**What it does:** recovers the design intent by cross-referencing already-recorded decisions with the code; gaps in
the rationale are flagged as learnings to confirm, instead of becoming silent assumptions.

---

## B. Health, debt, and dependencies

### 5. Find hotspots and technical debt
> Find the hotspots and technical debt in `<project X>`. The `researcher` identifies the most complex/most-changed/most-coupled areas and the riskiest code, ranks them by impact, and writes a `learning` note per significant hotspot (what, why risky, suggested direction). The `librarian` indexes them under a `tech-debt` tag.

**What it does:** locates where the risk concentrates and turns it into prioritizable notes with the `tech-debt` tag;
it becomes a searchable analysis backlog, not a vent in the chat.

### 6. Dependency analysis
> Analyze the dependencies of `<project X>`. The `researcher` lists direct dependencies, their role, version risk (outdated/abandoned), and any duplication/overlap, and records a `memory` note with the dependency map. Flag anything that should be removed or bumped as a `learning` note.

**What it does:** gives visibility into the dependency tree and its risks; the map stays as a durable note
and candidates to remove/update become actionable learnings.

### 7. Map coupling and boundaries
> Map the coupling in `<project X>`: which modules depend on which, where the boundaries are, and where they leak. The `researcher` produces a dependency/coupling diagram (Mermaid) in a `memory` note and flags the worst cross-boundary leaks as `learning` notes. The `librarian` indexes them.

**What it does:** reveals where the boundaries leak and the coupling hurts, with a durable diagram; the worst
leaks are flagged to guide future refactorings.

### 8. Coverage and test blind-spot analysis
> Analyze where `<project X>` is and isn't tested. The `researcher` maps which areas have tests, which critical paths have none, and where tests are shallow, recording a `learning` note with the biggest test blind spots ranked by risk. Don't write tests — just analyze and record.

**What it does:** maps the test blind spots by risk without writing any test; the `learning` note
becomes the prioritized list of what to cover first when there's time.

---

## C. Behavior and data

### 9. Map the data flow
> Trace the data flow of `<project X>` for `<a key operation/request>`: where data enters, how it's transformed, where it's stored, and what leaves. The `researcher` writes a `memory` note with a Mermaid sequence/flow diagram and tags the stores and external calls involved.

**What it does:** follows a piece of data end to end and records it as a durable flow diagram; it exposes
transformations and stores that reading the code loose wouldn't make obvious.

### 10. Performance analysis
> Analyze the performance profile of `<project X>` for `<flow/endpoint>`. The `researcher` identifies the likely bottlenecks (N+1, large payloads, sync I/O, cold starts), reasons about cost, and records a `learning` note with the suspected hotspots and what to measure. The `reviewer` challenges each hypothesis.

**What it does:** raises bottleneck hypotheses and what to measure, with the reviewer contesting each one; the
`learning` note keeps the suspicions for performance validation to start from there.

### 11. Surface security analysis
> Analyze the security surface of `<project X>`: the `researcher` lists the trust boundaries, inputs, authn/authz points, and secret handling, recording a `memory` note tagged `security` with the threat surface. The `reviewer` ranks the top risks. Don't exploit anything — map and rank only.

**What it does:** maps the threat surface and ranks the risks without exploiting anything; the note with the
`security` tag becomes the auditable basis for a future security validation.

### 12. Map states and the state machine
> Map the states of `<feature/entity>` in `<project X>`: every state, the transitions, and the events that trigger them. The `researcher` writes a `memory` note with a Mermaid state diagram and flags any unreachable or dead-end state as a `learning` note.

**What it does:** makes the implicit state machine in the code explicit, with a durable diagram; dead
or unreachable states are flagged as a learning.

---

## D. Impact and decision

### 13. Impact analysis of a proposed change
> Before changing `<thing>` in `<project X>`, analyze the blast radius. The `researcher` `search`es the vault and the code for everything that depends on it, lists the affected areas and risks, and records a `decision` note with the impact assessment. The `reviewer` challenges whether anything was missed.

**What it does:** measures the blast radius of a change before making it, cross-referencing vault and code; the
impact `decision` note guides the safe scope and the reviewer hunts for what was left out.

### 14. Compare two existing areas / approaches
> In `<project X>`, compare how `<area A>` and `<area B>` solve `<similar problem>`. The `researcher` documents both approaches, their trade-offs, and which is the better pattern to standardize on, recording a `decision` note with the recommendation. The `reviewer` argues the opposite case before it's finalized.

**What it does:** confronts two existing solutions to choose a pattern to follow; the `decision` note
keeps the recommendation and the reviewer forces the counterargument before closing it.

### 15. Find the root cause of a behavior
> Investigate why `<observed behavior>` happens in `<project X>`. The `researcher` `search`es prior notes, traces the code path that produces it, and records a `learning` note with the root cause (not just the symptom) and where it lives. The `reviewer` confirms the causal chain holds.

**What it does:** pursues the root cause of a behavior, not the symptom, and records it with the path in the
code; the reviewer validates the causal chain before it becomes a durable learning.

### 16. Audit convention consistency
> Audit `<project X>` for convention consistency: naming, file layout, error handling, imports. The `researcher` lists where the code follows the project conventions and where it diverges, recording a `learning` note with the divergences ranked by how much they hurt. Don't fix — just analyze and record.

**What it does:** maps where the code strays from its own conventions, ranked by how much it hurts, without fixing
anything; it becomes the prioritized list for a future standardization pass.

---

## E. Onboarding to the vault

### 17. Onboard the project to the vault
> Onboard `<project X>` into the team memory. The `researcher` maps the architecture, key folders, conventions, and the 3–5 most important concepts, writing one atomic `memory` note per concept (well tagged, with `related` wikilinks). The `librarian` then runs `index` so future sessions start informed. Report the resulting note list.

**What it does:** the standard kickoff of a project's vault — converts the initial understanding into 3–5 atomic
indexed notes, exactly what makes the next session start with `search` instead of rediscovery.

### 18. Cross-check analysis across projects
> Run `search <pattern/problem> --all` and tell me which other projects already analyzed or solved something like `<problem>`, linking the notes. The `researcher` then notes for `<project X>` what's reusable from those, recording a `learning` note with the cross-project references via `[[wikilinks]]`.

**What it does:** reuses analyses from *other* repositories via the per-project partition + the `global`
space; what serves `<project X>` is recorded with cross-links, avoiding re-analysis.

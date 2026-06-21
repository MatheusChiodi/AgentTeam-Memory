# 18 prompts for architecture

Ready-to-paste prompts for the **lead** (in `claude`, inside a project) when the work is about
**designing before coding**: defining the stack, modeling data, separating modules, and recording decisions.
Each one exercises the agent team + the central memory vault. Swap the parts between `<brackets>`.
The prompts are in English (the team operates in English); the **explanation of each one is in English**:
it states **what the prompt does** and **how it uses the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once per project so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).

---

## A. System design

### 1. Sketch the high-level architecture
> Goal: design the high-level architecture for `<system>`. Don't write code. The `researcher` searches the vault (`search architecture`, `search <domain>`) for prior decisions, the team agrees on the major components and how they talk, and the `executor` records the result as a `decision` note (`save decision … --task <id>`) with a Mermaid diagram of the boxes and arrows.

**What it does:** forces a design of blocks and flows before any code, starting from what has already been
decided in the vault, and leaves the diagram persisted in a decision note for the next session to consult.

### 2. Define requirements before designing
> Before any design, the `researcher` writes the functional and non-functional requirements for `<system>` (latency, scale, consistency, budget) as a `memory` note, and `SendMessage`s them to the `reviewer`, who flags any requirement that is vague or untestable. Only then do we discuss the architecture.

**What it does:** anchors the design in explicit, reviewed requirements instead of assumptions; the
requirements note becomes the yardstick against which every later decision is checked.

### 3. Map contexts and boundaries
> Identify the bounded contexts of `<system>` and the boundaries between them. The `researcher` proposes the split, the `reviewer` argues where a boundary is wrong or leaky, and the team records the agreed module map as a `decision` note with a Mermaid diagram showing each context and its owned data.

**What it does:** separates the system into modules with clear responsibilities and attacks coupling early; the
diagram and the note make explicit who owns which data, avoiding leakage of responsibility.

### 4. Plan before building (researcher → executor)
> Don't write code yet. The `researcher` produces a build plan for `<task>` (steps, files to touch, risks) and hands it to the `executor` via `SendMessage`. The `executor` reviews it for feasibility, pushes back on anything underspecified, and only then is the plan saved as a `decision` note with `--task <id>`.

**What it does:** materializes the team's discovery→execution separation: the plan is negotiated between the two
roles before touching a file, and is recorded to guide (and audit) the implementation.

## B. Stack and technology

### 5. Choose and justify the stack
> Recommend a stack for `<project>`. The `researcher` lists viable options with pros/cons against our requirements; the `reviewer` challenges each choice (lock-in, learning curve, ops cost). Record the chosen stack and the rejected alternatives as a `decision` note tagged `stack` so the rationale survives.

**What it does:** turns the technology choice into an argued, reviewed decision, and preserves both
the winning option and the discarded ones — so no one reopens the discussion without context later.

### 6. Validate the default stack against the case
> We default to React 19 + TS + Vite (web) and CF Workers + KV (backend). For `<this project>`, the `reviewer` argues whether the default fits or where a deviation is justified. Record the verdict as a `decision` note tagged `stack`; if we deviate, note exactly why.

**What it does:** avoids applying the default stack on autopilot: it asks for an adversarial check of the fit and
records any deviation with justification, keeping coherence across projects without being dogmatic.

### 7. Evaluate adding a dependency
> We're considering adding `<library>`. The `researcher` checks the vault for prior notes on it (`search <library>`) and gathers size, maintenance, and alternatives; the `reviewer` weighs it against just writing it ourselves. Record the call as a `decision` note tagged `dependency`.

**What it does:** treats "pulling in a lib" as an architectural decision — it researches history and alternatives and
leaves the trade-off (build vs. buy) recorded, so the next similar evaluation starts ready.

## C. Data modeling

### 8. Model the data schema
> Design the data model for `<feature/system>`. The `researcher` lists the entities, relationships, and access patterns; the `executor` proposes the schema (tables/collections/KV keys) and records it as a `decision` note with a Mermaid ER diagram. The `reviewer` checks for missing indexes and N+1 read patterns.

**What it does:** starts from the access patterns to arrive at the schema (not the other way around), documents the model
with an ER diagram, and already gets a review of the points that usually hurt in production.

### 9. Choose the right storage
> For `<data>`, the `researcher` compares storage options (relational, KV, document, cache) against our access patterns and consistency needs; the `reviewer` probes each for the failure mode we'd hate most. Record the choice as a `decision` note tagged `data,storage`.

**What it does:** aligns the storage choice to the real access pattern and the guarantees required,
and records which failure mode was accepted — information that is rarely written down anywhere.

### 10. Plan schema evolution / migration
> We need to change `<existing schema>`. The `executor` drafts a backward-compatible migration plan (expand/contract), lists what could break, and the `reviewer` plays devil's advocate against each step. Record the migration plan as a `decision` note tagged `migration`.

**What it does:** treats a schema change as a risky operation: an expand/contract plan, a list of possible breakages,
and an adversarial check, with everything preserved in a note so it can be executed safely.

## D. Architecture decisions (ADR)

### 11. Record an architecture decision (ADR)
> Record an architecture decision for `<choice>` in ADR form: context, options considered, decision, and consequences. Save it as a `decision` note with `--task <id>` tagged `adr`, and link the related notes with `[[wikilinks]]`. The `librarian` then runs `index` so it shows up in the project `_index.md`.

**What it does:** standardizes decisions in the ADR format (context/options/decision/consequences) and connects them to
the related notes, becoming a searchable, indexed record instead of a lost conversation.

### 12. Revisit an old decision
> We're reconsidering `<past decision>`. The `researcher` finds the original `decision` note (`search <topic>`), summarizes the context that justified it, and the team decides whether it still holds. Record a new `decision` note that supersedes the old one and links back to it.

**What it does:** uses the vault to recover the original rationale before changing course, and chains the new
decision to the old one via wikilink — preserving the timeline of the reasoning instead of erasing it.

### 13. Consult memory before designing
> Before we design `<topic>`, run `search <topic>`, `search architecture`, and `search <related-tag>` and summarize every relevant decision and learning (summary + tags) so we don't contradict or re-litigate past architecture work.

**What it does:** a pure reading step that surfaces prior ADRs and learnings; cheap and
usable even without the full team, it prevents the new design from colliding with what has already been decided.

## E. Compare approaches and trade-offs

### 14. Compare approaches (panel of judges)
> Have three teammates each propose a different architecture for `<problem>` — e.g. simplest, most scalable, most familiar to our stack. They critique each other via `SendMessage`, score the trade-offs, then the team records the winning approach and why, with the runners-up noted, as a `decision` note.

**What it does:** generates diverse options and scores them through peer critique before deciding; better than
iterating on the first idea, and the reasoning (including the losers) is preserved in a note.

### 15. Explicit trade-off table
> For `<decision>`, the `researcher` builds a trade-off table (rows = options, columns = the dimensions we care about: cost, complexity, scale, time-to-ship) and the `reviewer` challenges the scoring. Record the table and the final pick as a `decision` note tagged `tradeoff`.

**What it does:** makes the trade-off visible and questionable in a table, instead of a choice by intuition;
the note keeps both the table and the decision, making clear what was prioritized and what was given up.

### 16. Prove the riskiest point first (spike)
> Identify the single riskiest assumption in the `<design>`. The `executor` builds a throwaway spike to test only that, the `reviewer` judges whether it held, and we record the result as a `learning` note before committing to the full architecture.

**What it does:** attacks the biggest uncertainty with a throwaway prototype before committing the entire
design, and captures the result as a learning — cheap now, expensive if discovered later.

## F. Scalability and robustness

### 17. Review the design for scale
> The `reviewer` stress-tests the `<design>` against `<expected load>`: where is the bottleneck, what breaks first, what's the failure mode under partial outage? The `researcher` checks the vault for how we scaled similar systems before. Record the findings and any design changes as a `decision` note tagged `scalability`.

**What it does:** subjects the design to a load and partial-failure analysis guided by the vault's history,
and records bottlenecks and resulting changes — anticipating what would only appear under real traffic.

### 18. Integrate an existing project into the architecture memory
> This repo is new to the team. The `researcher` maps its architecture, module boundaries, data model, and key conventions and writes 3–5 atomic `memory`/`decision` notes (one concept each, well tagged); the `librarian` runs `index` so future architecture work starts informed.

**What it does:** kicks off the architecture vault of a project, so the next team can `search`
instead of rediscovering the module boundaries and the data model every session.

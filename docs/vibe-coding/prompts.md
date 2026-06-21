# 18 prompts for vibe coding

Ready-to-paste prompts for the **lead** (in `claude`, inside a project) when the goal is to
explore fast, prototype, and iterate freely — without choking the flow with heavy process.
Each one exercises the agent team + the central memory vault. Swap the parts between `<brackets>`.
The prompts are in English (the team operates in English); the **explanation of each one is in English**:
it states **what the prompt does** and **how it uses the team and the memory**.

> Reminder: run `node "<home>/.claude/memory-team/memory.mjs" enable` once per project so
> the hooks start enforcing the memory discipline there (without it they stay fail-open, they don't block).
> In vibe coding keep the trail minimal: capture only what was worth it, at the end of the spurt.

---

## A. Explore and prototype fast

### 1. Feasibility spike
> Quick feasibility spike: can we do `<idea>` in this codebase? Don't build anything production-ready. The `executor` wires the smallest end-to-end path that proves it works or fails, and reports back in 5 lines. Only if it's promising, save one `learning` note (`save learning … --agent executor --task <id>`) with what made it viable or not.

**What it does:** optimizes for a fast yes/no answer with the shortest possible path; it only touches the memory if the spike has signal, avoiding junk notes.

### 2. Make it work first
> Make `<feature>` work first, clean later. The `executor` hacks the happy path end-to-end without worrying about structure. Keep a running scratch list of shortcuts taken; when it works, save a single `memory` note (`--task <id>`) listing those shortcuts so we know what to repay later.

**What it does:** frees the executor to prioritize working over form, but records the debt taken on in a single note — the minimal trail that makes cleanup possible later.

### 3. Fast scaffolding
> Scaffold a throwaway prototype for `<idea>`: minimal files, no tests, no docs. The `executor` sets up the skeleton fast. Mark the prototype clearly as throwaway in a `memory` note (`--task <id>`) so nobody mistakes it for production code.

**What it does:** sets up the minimal structure to start playing with the idea right away, and makes it explicit in memory that it's throwaway — so the reviewer doesn't wrongly demand production quality.

### 4. Free iteration on an idea
> Free iteration mode on `<idea>`: the `executor` tries 2–3 variations quickly and shows them to me side by side. No memory writes between attempts — keep the flow. Once I pick one, save a `decision` note (`--task <id>`) recording the chosen variation and why the others lost.

**What it does:** keeps the try cycle fast without a memory interruption at every step, and only persists the decision when you choose — capturing the result, not the noise.

### 5. Feature brainstorm
> Brainstorm mode: with me, the `researcher` and `reviewer` throw out `<N>` possible directions for `<area>`, each in one line. Debate roughly via `SendMessage`, rank them, and save the shortlist as one `memory` note (`--task <id>`) so we can revisit later without re-brainstorming.

**What it does:** generates many options fast with light peer critique, and archives the shortlist as a single note so the next session starts from what was already thought through.

### 6. UI proof of concept
> Vibe out a UI proof of concept for `<screen/component>`. The `executor` builds something visual and clickable fast, prioritizing feel over correctness. Capture the design intent (not the code) in a `memory` note (`--task <id>`) so the look survives even if we throw the code away.

**What it does:** focuses on something visible and tangible fast, and saves the *design intent* in memory — what's worth preserving from a UI POC, even if the code is thrown away.

### 7. Explore a new lib or API
> Let's explore `<library/API>` by playing with it. The `researcher` pulls the key concepts and gotchas (`search` first in case we've used it before), the `executor` writes tiny throwaway snippets to feel out the API. Save the gotchas as a `learning` note tagged `<library>` so the next spike skips them.

**What it does:** combines light discovery with hands-on experimentation; it checks the memory first to avoid repeating learnings and archives the gotchas with a tag for future reuse.

---

## B. Iterate and capture in the flow

### 8. Periodic capture of decisions
> We'll vibe code `<feature>` for a while. Don't interrupt the flow, but every time we lock in a real decision, the `executor` drops a one-line `decision` note (`--task <id>`). At the end, give me the list of decisions captured.

**What it does:** keeps the free coding flow while dropping one-line decision markers as they arise — a minimal trail that doesn't choke the vibe but avoids losing the reasoning.

### 9. Prototype checkpoint
> Checkpoint: pause the vibe and have the `executor` snapshot where the prototype stands — what works, what's faked, what's next — as one `memory` note (`--task <id>`). Then we keep going.

**What it does:** creates a quick save point in the middle of the exploration so that, if the session drops, you can resume from where you stopped without rebuilding the mental state.

### 10. Pivot the idea
> We're pivoting from `<old direction>` to `<new direction>`. Before we drop the old path, the `executor` saves a short `decision` note (`--task <id>`) on why we abandoned it, so we don't accidentally retry it later. Then start fresh on the new direction.

**What it does:** preserves the reason for abandoning a path before pivoting — cheap to do and prevents the team from rediscovering the same dead end weeks later.

### 11. When the vibe stalls
> I'm stuck on `<problem>`. The `researcher` runs `search <problem>` and `search <related-tag>` to surface anything we already learned, then throws 3 fresh angles at it. We pick one and keep moving; if one unblocks me, save it as a `learning` note (`--task <id>`).

**What it does:** uses the memory as the first resort when you get stuck, then generates new angles; what unblocks you becomes a searchable learning for the next similar block.

### 12. Improvised mobile task (Expo)
> Vibe a quick `<screen/feature>` in this Expo app. The `executor` checks our existing navigation/state patterns in the vault first (`search`), builds it fast, and notes any EAS/build implication as a `memory` note tagged `expo`. Skip tests for now.

**What it does:** keeps the speed on mobile by reusing patterns already known from the vault and accumulates Expo/EAS particularities under the project, even in a rushed prototype.

### 13. Spike on a Cloudflare Worker
> Quick spike: stand up `<endpoint/binding>` in this Worker just to see it respond. The `executor` wires the minimal route/KV path and records the binding/secret decisions as a `decision` note tagged `cloudflare` — even for a throwaway, infra choices are easy to forget.

**What it does:** proves the infra idea fast and captures the binding/secret/route choices, which slip from the mind quickly even in throwaway code.

---

## C. From prototype to clean code

### 14. Cleanup handoff to the executor
> The vibe prototype works. Now harden it: the `executor` turns `<prototype/path>` into clean code, following this project's conventions, paying back the shortcuts listed in our earlier `memory` notes (`search` them first). Record the cleanup decisions as a `decision` note (`--task <id>`).

**What it does:** turns the prototype into production code using the shortcut notes as a debt checklist; the decision note documents what was hardened and why.

### 15. Adversarial review after the vibe
> Before we trust this prototype, `reviewer`: review it adversarially — assume the happy-path hacks hide bugs until proven otherwise. For each finding, state the test that would expose it, message the `executor`, and record confirmed issues as `learning` notes.

**What it does:** subjects the improvised code to a skeptical pass focused precisely on the happy-path shortcuts; confirmed problems become learnings instead of surprises in production.

### 16. Decide: discard or evolve
> Decision time on `<prototype>`: the `researcher` and `reviewer` argue keep-and-evolve vs throw-away-and-rebuild via `SendMessage`, weighing the shortcuts we logged. Record the verdict as a `decision` note (`--task <id>`) with the losing option noted for the record.

**What it does:** forces a conscious choice between evolving or rebuilding the prototype, anchored in the recorded shortcuts, and preserves both the verdict and the rejected alternative.

### 17. Promote the spike to a feature
> Promote the `<spike>` into a real feature. The `researcher` gathers the existing patterns it should align with, the `executor` re-implements it properly with tests, and a `decision` note (`--task <id>`) explains how the final version differs from the spike and why.

**What it does:** separates the exploratory spike from the serious implementation, aligning the final version to the project's patterns and documenting the difference between the two for future reference.

### 18. Save what was worth it at the end
> Wrap up the vibe session: the `executor` reviews everything we tried and saves only what's worth keeping — winning decisions as `decision` notes, reusable insights as `learning` notes, all with `--task <id>`. Then the `librarian` runs `index`. Discard the rest; tell me in 5 lines what persisted.

**What it does:** the end-of-session hygiene step for vibe coding — distills the chaotic exploration into a few valuable notes and reindexes, so the memory stays curated and not bloated with junk.

# AgentTeam-Memory — User Stories (Phase 2)

> Second wave of expansion: **real-time observability and native integration with
> Claude Code**. Continues the numbering of [Phase 0/1](./USER-STORIES.md) — starts at **US-033**
> (the base goes up to US-032) and at **F11** (the base goes up to F10).
>
> Phase theme: the vault stops being just a queryable dead archive and starts to **overflow into
> the Claude Code interface itself** (statusline), to **record session cost/usage** and to
> offer **live operation tools** (watch, digest, doctor). Architecture reference:
> [`ARCHITECTURE-PHASE-2.md`](./ARCHITECTURE-PHASE-2.md).

## Convention (inherited from Phase 1)

`<ref>` = loose reference to a note (exact basename → slug fragment → substring of
name/summary), resolved by `resolveNotes`. Every read tool accepts `--json` and, in that mode,
emits **only** `res.data`. Mutations rewrite via `formatNote` preserving unknown frontmatter.

## Phase map

| # | Feature | Tool/entrypoint | US |
| --- | --- | --- | --- |
| **F11** ⭐ | Budget and **real-time** usage in the Claude Code statusline | `statusline.mjs` (standalone) | US-033 · US-034 · US-035 · US-036 |
| **F12** | Usage/cost ledger (session history) | `usage` | US-037 |
| **F13** | Live tail of the vault (follow notes live) | `watch` | US-038 |
| **F14** | Session digest (automatic summary of a window) | `digest` | US-039 |
| **F15** | Health check of the installation | `doctor` | US-040 |
| **F16** | Central memory-team configuration | `config` | US-041 |
| **F17** | Note templates | `template` | US-042 |
| **F18** | Pin / highlight notes | `pin` | US-043 |
| **F19** | Vault snapshot / checkpoint | `snapshot` | US-044 |
| **F20** | Automatic wikilink suggestion | `relate` | US-045 |
| cross-cutting | Real time cheap/fail-proof · tests | — | US-046 · US-047 |

---

## F11 — Budget and real-time usage (⭐ the flagship feature)

> **Pain:** today, to know how much of the plan/context I have already consumed in a Claude Code
> session, I have to run `/usage` manually, leave the flow and read a report. I want to see this **passively,
> always**, in the footer of the CLI itself — which updates every turn.
>
> **Mechanism:** Claude Code supports a custom **statusLine** (`settings.json → statusLine`):
> a command that receives a state JSON via **stdin** on every screen update and prints **one
> line** that Claude Code renders in the footer. It is the only extension point that delivers
> "passive and continuous information". The tool is, therefore, a **standalone entrypoint** (`statusline.mjs`),
> not a registry command (see architecture — reason: performance/no stdin in `ctx`).
>
> **The payload already delivers what `/usage` shows.** Verified in the official docs: the statusLine JSON
> carries `rate_limits.five_hour.used_percentage` and `rate_limits.seven_day.used_percentage` (= the **plan
> usage** of the subscription — the exact pain) and a `resets_at` (epoch) per window; it also carries `context_window`
> (`used_percentage`, `context_window_size`, `current_usage.{input,output,cache_*}_tokens`) and
> `cost.total_cost_usd`. Therefore, **there is no need to parse the transcript** in the happy path — only as a
> fallback for old versions (`< 2.1.132`).
>
> **Honest caveat (becomes an acceptance criterion, not a broken promise):** `rate_limits` is only present
> for **Claude.ai Pro/Max** accounts and **after the 1st response** of the session; with **API key / Bedrock /
> Vertex** the field does not exist (those plans have no 5h/7d window). When absent, the statusline
> **degrades** to `context_window` + `cost` and signals the plan as `n/a`.

### US-033 — See plan usage in real time, without running `/usage`
**As a** Claude.ai Pro/Max user **I want** the footer to show, always and updated every turn,
**how much of my plan I have already spent** (5h and 7-day windows) **so that** I do not have to interrupt the flow
with `/usage`.
- **Tool:** `statusline.mjs` (standalone) · **Feature:** F11
- **Acceptance:**
  - Reads the status JSON from **stdin** and prints **a single line** to stdout, with no noise on stderr.
  - The `plan:` segment shows `rate_limits.five_hour.used_percentage` and
    `rate_limits.seven_day.used_percentage` (e.g.: `plan 5h 23% · 7d 41%`), which is exactly what
    `/usage` reports — the literal pain solved.
  - Optionally shows the `resets_at` of each window as relative time ("⟳2h13"). `resets_at` is
    **epoch in seconds**; the time is relative to `Date.now()` with a **clamp**: an already-reopened window shows
    "now", never negative time (deterministic acceptance).
  - **Per-window degradation, independent** (A6): each window (`five_hour`, `seven_day`) only enters if
    it carries a finite `used_percentage` — one present and the other absent does not leak `undefined%`.
  - **Honest total degradation:** when `rate_limits` is entirely absent (API key / Bedrock /
    Vertex, or before the 1st response), the segment becomes `plan n/a` and the focus shifts to context + cost
    (US-034) — without inventing a plan number.
  - Resilient: empty stdin/invalid JSON → short fallback and **exits 0** (never brings down the render of
    Claude Code, never hangs). All in **one pass**, **zero dependencies**.

### US-034 — See context and cost together, with a bar and ceiling alerts
**As a** user **I want** to see, alongside the plan, how much of the **context window** and how much
**cost** I have already consumed, with a bar and colors that change near the limit **so that** I notice the risk of
overflowing before it happens.
- **Tool:** `statusline.mjs` · **Feature:** F11
- **Acceptance:**
  - **Context** prioritizes **recomputing** from the absolute tokens `context_window.current_usage`
    (`input + cache_read + cache_creation`) over the correct limit; only then uses `used_percentage`; and
    finally, in the absence of `context_window` (version `< 2.1.132`), the **fallback** sums the last `usage` of the
    `transcript_path`.
  - **Window limit:** `[1m]` in the `model.id` has **precedence** = 1M. Reason (verified by the
    researcher): `context_window_size` from the payload comes as `200000` even in an extended window (Claude Code
    bug #36725); trusting it would inflate the `%` by 5×. Without `[1m]`, uses `context_window_size`; otherwise 200k, with
    `exceeds_200k_tokens` as a redundant signal. The custom limit is configurable (F16/US-041).
  - **Cost** uses `cost.total_cost_usd` **when the payload exposes it**; absent → omits the `$` segment.
  - Renders a textual **bar** of the context usage (e.g.: `[█████░░░░░] 53%`).
  - Severity **thresholds** (default `warn=70%`, `danger=90%`, coming from the config — F16): neutral,
    attention and critical. **ANSI colors by default** (Claude Code renders ANSI in the footer), degrading
    to plain text under `NO_COLOR`/`TERM=dumb` (N5).

### US-035 — See the memory-team context alongside consumption
**As a** teammate **I want** the footer to also show the detected project, whether enforcement is
active and how many notes already exist **so that** I confirm, at a glance, that I am writing memory in the
right place.
- **Tool:** `statusline.mjs` · **Feature:** F11
- **Acceptance:**
  - A `mem:` segment with the **project** detected (from `workspace.current_dir`/cwd via `lib.mjs`),
    the **enabled** flag (`.memory-team` marker) and the **note count** of the project + global.
  - Reuses `lib.mjs`/`notes.mjs` (without reimplementing vault resolution) — cheap reading,
    without scanning the whole vault every turn (counts per project, not `--all`).
  - The composition of the segments is **stable and ordered** (mem · context · cost · model), separated
    by a readable delimiter.

### US-036 — Install/remove the statusline without editing JSON by hand
**As a** maintainer **I want** to run a command that registers (or removes) the statusline in my
`settings.json` **so that** I activate the feature without touching the file manually and risk breaking it.
- **Tool:** `statusline.mjs --install` / `--uninstall` (and `--demo`) · **Feature:** F11
- **Acceptance:**
  - `--install` does a **non-destructive merge** into `~/.claude/settings.json` adding the `statusLine`
    block that points to this script; preserves the rest of the file; it is **idempotent**.
  - `--uninstall` removes only the `statusLine` block that memory-team wrote.
  - `--demo` runs the pipeline with an embedded sample payload (without needing Claude Code),
    printing the line as it would appear — serving as a manual test and as living documentation.
  - Without `settings.json`, creates a minimal valid one; an invalid existing JSON → clear error, does **not** overwrite.

---

## F12 — Usage/cost ledger (history)

### US-037 — Aggregate the cost and tokens of my sessions
**As a** user **I want** to run `usage` **so that** I see, in aggregate, how much my sessions cost and how many
tokens they consumed (per day/project) **so that** I have the history that the statusline only shows
"right now".
- **Tool:** `usage` · **Feature:** F12
- **Acceptance:**
  - Scans the accessible session transcripts (`.jsonl`) and aggregates `cost`/tokens by **day** and by
    **project**; window adjustable via `--since YYYY-MM-DD` and `--limit n`.
  - `--json` returns `{ totalUsd, totalTokens, byDay: [...], byProject: [...] }`.
  - `--save` persists the aggregate as a `memory` note (tag `usage`), becoming auditable history.
  - No accessible transcripts → clear message, zeroed `data`, exit 0 (not an error).

---

## F13 — Live tail of the vault

### US-038 — Follow the team's notes live
**As a** lead **I want** to run `watch` **so that** I see, in real time, each new note that the teammates
write to the vault **so that** I follow the progress without repeatedly running `recent`.
- **Tool:** `watch` · **Feature:** F13
- **Acceptance:**
  - Observes the project partition (and global) with `fs.watch` and, for each note **created**, prints a
    line `HH:MM type/agent — title` (with `summary` when present).
  - `--all` observes all projects; ends cleanly on `SIGINT` (Ctrl-C) without a stacktrace.
  - Does not re-read pre-existing notes (only events from the start); dedup of duplicate FS events.
  - Since it is a long-running process, it stays **outside** the standard `lines/data` contract (continuous stream) — documented.

---

## F14 — Session digest

### US-039 — Close the session with an automatic summary
**As a** lead **I want** to run `digest --since <date>` **so that** I get a markdown summary of what the
team produced in a window **so that** I record a session closure without re-reading note by note.
- **Tool:** `digest` · **Feature:** F14
- **Acceptance:**
  - Collects the notes of the window (`--since`, default = today) and generates a markdown grouped by **agent**
    and by **type**, with bullets of `title — summary` and counts.
  - `--save` persists the digest as a `memory` note (tag `digest`), with wikilinks to the source notes.
  - `--json` returns `{ since, total, byAgent, byType, notes: [...] }`.
  - Empty window → valid digest reporting "no note in the window", exit 0.

---

## F15 — Health check

### US-040 — Diagnose the memory-team installation
**As a** maintainer **I want** to run `doctor` **so that** I check whether hooks, settings, statusline and vault
are healthy **so that** I discover a half-broken installation before it gets in my way.
- **Tool:** `doctor` · **Feature:** F15
- **Acceptance:**
  - Checks: vault accessible and writable; `settings.json` parseable; `TaskCompleted`/`TeammateIdle` hooks
    registered; `statusLine` pointing to an existing script; vault integrity (reuses `validate`).
  - Each check becomes a line `✓/✗/⚠ name — detail`; **exit 1** if there is at least one `✗`.
  - `--json` returns `{ ok, checks: [{ name, status, detail }] }`.
  - Does not fix anything by default (read-only diagnostic); only reports and, when useful, suggests the fix.

---

## F16 — Central configuration

### US-041 — Read and adjust memory-team preferences
**As a** user **I want** to run `config get/set <key> [value]` **so that** I adjust behaviors
(statusline thresholds, date format, custom context limit) **so that** I do not have defaults
hardcoded in the code.
- **Tool:** `config` · **Feature:** F16
- **Acceptance:**
  - `config list` shows all keys + effective value (default vs. override); `config get <k>`
    prints one; `config set <k> <v>` persists into a vault `config.json`.
  - Known keys have an **embedded default**; an unknown key in `set` is accepted but warned about;
    in `get` it returns empty without error.
  - Values typed enough (numbers become numbers); `--json` returns the effective config object.
  - It is the source of the statusline thresholds (F11/US-034) and of the custom context limit.

---

## F17 — Note templates

### US-042 — Create a note from a template
**As a** teammate **I want** to run `template <name> "<title>"` **so that** I generate a note already with the
section structure that that kind of delivery requires **so that** I standardize and save time.
- **Tool:** `template` · **Feature:** F17
- **Acceptance:**
  - `template list` lists the available templates (embedded + the vault ones in `_templates/`).
  - `template <name> "<title>"` creates a note filling the body with the template skeleton and the
    canonical frontmatter (reuses the naming/filing of `save`).
  - A nonexistent template → clear error listing the valid ones, exit 1, nothing written.
  - Templates support minimal placeholders (`{{title}}`, `{{date}}`, `{{project}}`, `{{agent}}`).
  - An **unknown placeholder** (e.g.: `{{foo}}`) stays **literal** in the body — it is neither substituted
    nor removed (predictable contract; N2).
  - **Does not overwrite state** (US-004/US-031): if the template declares `type: state` and `save` is
    idempotent (`data.created === false`), the template **preserves** the existing note and reports
    `created:false` — never silently clobbers a state (B1 from the review).

---

## F18 — Pin / highlight notes

### US-043 — Pin the notes that matter
**As a** lead **I want** to run `pin <ref>` **so that** I mark key notes **so that** they appear at the top
of `search`/`list`/`recent` and do not get lost in the volume.
- **Tool:** `pin` · **Feature:** F18
- **Acceptance:**
  - `pin <ref>` adds `pinned: true` to the frontmatter (rewrites via `formatNote`); `pin <ref> --off`
    removes it; `pin --list` lists the pinned ones.
  - Pinned notes are ordered **before** the others in `search`/`list`/`recent` (normal tie-break among them).
  - An ambiguous/nonexistent `<ref>` → clear error, exit 1, without writing.
  - Preserves all unknown frontmatter in the round-trip (invariant US-030).

---

## F19 — Vault snapshot / checkpoint

### US-044 — Take a checkpoint of the vault before a risky operation
**As a** maintainer **I want** to run `snapshot` **so that** I freeze the current state of the vault **so that** I can
go back if a bulk `retag`/`prune`/`import` goes wrong.
- **Tool:** `snapshot` · **Feature:** F19
- **Acceptance:**
  - `snapshot` creates a dated checkpoint in `_snapshots/<timestamp>/` (copy of the notes, without recursive
    `_snapshots`); `snapshot --list` lists the existing ones with date and count.
  - `snapshot --restore <id>` restores the vault from a checkpoint, **requiring** the explicit flag
    (destructive operation — invariant US-031) and first taking a safety snapshot.
  - `--restore` is a **reset** (clear-and-restore), not a merge: notes created **after** the checkpoint
    disappear on restore (that is the goal — "go back"); `_snapshots/` is never deleted.
  - `--restore <id>` with a **nonexistent/ambiguous id** → clear error, exit 1, **nothing touched** (A5).
  - The **safety** snapshot (taken before the restore) does not pollute `--list` by default (A2).
  - `--json` returns `{ id, path, count }` on creation and the list on listing.
  - **Direct file copy** (does not serialize via `export`/F9): preserves the note's bytes with
    full fidelity and zero formatting loss — a distinct purpose from `export` (portable logical
    serialization). Zero-dependency, no external tool. *(A3 relaxed: reuse of `export` is not a requirement.)*

---

## F20 — Automatic wikilink suggestion

### US-045 — Receive suggestions for links between notes
**As a** librarian **I want** to run `relate <ref>` **so that** I see which other notes are candidates for a
`[[wikilink]]` by tag/summary similarity **so that** I densify the graph without hunting manually.
- **Tool:** `relate` · **Feature:** F20
- **Acceptance:**
  - Given `<ref>`, ranks other notes by similarity (tags in common > summary terms > type),
    ignoring the already-linked ones; shows the top-N with the score and the reason.
  - `relate <ref> --apply` adds the top suggestions to the note's `related` (rewrites via `formatNote`),
    **non**-destructive over what already exists; without `--apply` it is only a suggestion (dry-run).
  - `--json` returns `[{ name, score, reason }]`; no candidates → clear empty list, exit 0.

---

## Integrity and quality (cross-cutting — inherited and extended)

### US-046 — Real time must not be expensive nor break the CLI
**As a** user **I want** the "live" features (statusline, watch) to be **cheap and fail-proof** **so that** running them every turn does not make the CLI slow nor bring down the render.
- **Tool:** `statusline.mjs`, `watch` · **Feature:** F11/F13
- **Acceptance:**
  - The statusline executes in one pass, reads **only** the necessary tail of the transcript, and on any
    error degrades to a short fallback exiting **0** (never throws to Claude Code).
  - Neither of the two adds an external dependency; both respect the Phase 1 design principles.

### US-047 — Every new Phase 2 tool comes with tests
**As a** maintainer **I want** each new tool to have `node:test` tests with a temporary vault
**so that** I keep the suite green and mock-free (invariant US-032 extended to Phase 2).
- **Tool:** cross-cutting · **Feature:** F11–F20
- **Acceptance:**
  - Each registry tool has an in-process happy path + edge branches; `statusline.mjs` is tested by
    feeding a synthetic payload via stdin and asserting the output line's segments.
  - `npm test` keeps passing entirely; no regression in the base's 25 tools.

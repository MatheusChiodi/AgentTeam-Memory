# AgentTeam-Memory — User Stories

> Formal specification of the CLI expansion. Each story follows the US-XXX format with
> verifiable **Acceptance criteria** and the related **tool/feature**. These criteria
> guide the executors (what to implement) and the reviewer (what to demand).
>
> Architecture reference: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Personas

| Persona | Role |
| --- | --- |
| **Lead** | Orchestrator of the agent team. Distributes tasks, reads vault reports, decides what to archive/clean up. |
| **Teammate** | Executor agent (researcher, executor, reviewer). READS memory before acting, WRITES a note after each delivery. |
| **Librarian** | Curator of the vault. Maintains the tag taxonomy, a coherent graph, indexes, archives and cleans up. The only one who runs `index`. |
| **Maintainer** | Owner of the AgentTeam-Memory project. Ensures portability, integrity and quality of the CLI itself. |

## Convention

`<ref>` = loose reference to a note (exact basename → slug fragment → substring of
name/summary), resolved by `resolveNotes`. Every read tool accepts `--json` and, in that mode,
emits **only** `res.data`.

---

## F0 — Base (Phase 0, already delivered)

> Pre-existing CLI commands; included to complete the contract coverage.

### US-001 — Locate the vault and the project state
**As a** teammate **I want** to run `where` **so that** I know which vault and project I am using and whether enforcement is active, before I start.
- **Tool:** `where` · **Feature:** F0
- **Acceptance:**
  - Prints vault root, detected project, project directory, `enabled` status, note count and project list.
  - `enabled` reflects the existence of the `.memory-team` marker in the cwd.
  - Populates `data` with `{ vaultRoot, project, projectDir, enabled, notes, projects }`.

### US-002 — Enable memory enforcement in a project
**As a** lead **I want** to run `enable` once at the project root **so that** the hooks start requiring memory notes there.
- **Tool:** `enable` · **Feature:** F0
- **Acceptance:**
  - Writes the `.memory-team` marker (if absent) and ensures the `projects/<proj>/` partition.
  - It is idempotent: running it again neither duplicates nor overwrites.
  - From then on `where` reports `enabled: yes`.

### US-003 — Search knowledge before acting
**As a** teammate **I want** to run `search <term>` **so that** I can reuse what the team already knows and avoid rework.
- **Tool:** `search` · **Feature:** F0
- **Acceptance:**
  - Ranks notes from the current project + global (`--all` = all projects) by relevance (tag > summary > name > type > agent > body).
  - `--json` returns the ordered list with `{ name, type, project, agent, summary, tags, file, score }`.
  - A term with no matches returns a clear message and empty `data` (not an error).

### US-004 — Record an atomic note after a delivery
**As a** teammate **I want** to run `save <type> "<title>"` **so that** I persist the result of my task in the vault.
- **Tool:** `save` · **Feature:** F0
- **Acceptance:**
  - Invalid `type` or empty title → usage error (exit 1), without writing a file.
  - Files it at the correct destination per type (memory/board/agents) with date/slug naming; a collision generates a `-2`, `-3`… suffix.
  - `state` is idempotent (does not overwrite an existing note); `--global` sends it to `global/`.
  - The frontmatter contains `type/project/agent/summary/tags/related/task/created` in canonical order.

### US-005 — Regenerate the vault indexes
**As a** librarian **I want** to run `index` **so that** I keep the project `_index.md` and the master one coherent.
- **Tool:** `index` · **Feature:** F0
- **Acceptance:**
  - Regenerates `projects/<proj>/_index.md` grouped by type and the master `_index.md` with a per-project count.
  - `--all` reindexes all projects.
  - Notes appear with wikilink, agent and summary.

---

## F1 — Extensible modular architecture

### US-006 — Add a tool without a merge conflict
**As a** maintainer **I want** to register a new command by dropping a file into `commands/` **so that** multiple agents can add tools in parallel without editing a central registry.
- **Tool:** infra (registry/dispatcher) · **Feature:** F1
- **Acceptance:**
  - A `commands/<name>.mjs` file that exports `{ name, summary, usage, run }` is discovered automatically on the next invoke.
  - Files starting with `_` and `registry.mjs` are ignored.
  - The new command appears in `help` with aligned `usage`/`summary`.
  - A module without `name` or without `run` is silently ignored (does not break the load).

### US-007 — Get consistent help for any command
**As a** teammate **I want** to run `help` (or no argument) **so that** I see all available tools and their signatures.
- **Tool:** dispatcher · **Feature:** F1
- **Acceptance:**
  - No command, `help`, or `--help` → lists all commands sorted, with types, vault and project in the footer.
  - Unknown command → stderr `unknown command: X` + help + exit 1.

---

## F2 — Note navigation and reading

### US-008 — List and filter the vault's notes
**As a** teammate **I want** to run `list` with filters **so that** I quickly find the relevant notes without opening Obsidian.
- **Tool:** `list` · **Feature:** F2
- **Acceptance:**
  - Supports `--type`, `--tag`, `--agent`, `--project`, `--since YYYY-MM-DD`, `--limit n`, combinable (AND).
  - By default excludes notes in `_archive/`; `--archived` includes them.
  - `--since` filters by `created`/mtime ≥ date; `--limit` caps the total after sorting (most recent first).
  - `--json` returns an array of `{ name, type, project, agent, summary, tags, created, file, archived }`.
  - No matches → clear message, `data: []`, exit 0.

### US-009 — Display a note's content by loose reference
**As a** teammate **I want** to run `show <ref>` **so that** I read a whole note, identifying it by a partial title.
- **Tool:** `show` · **Feature:** F2
- **Acceptance:**
  - Resolves `<ref>` via `resolveNotes`; a unique `<ref>` → prints frontmatter + body.
  - An ambiguous `<ref>` → lists the candidates and asks to refine (does not print an arbitrary one).
  - A nonexistent `<ref>` → clear message, exit 1.
  - `--json` returns `{ name, fm, body, file, rel }`.

### US-010 — See the most recent notes
**As a** lead **I want** to run `recent [n]` **so that** I review what the team produced last.
- **Tool:** `recent` · **Feature:** F2
- **Acceptance:**
  - Without `n`, uses a reasonable default (e.g.: 10); `recent 25` shows 25.
  - Sorts by date (created/mtime) descending.
  - `--json` returns the list with `{ name, type, agent, created, file }`.

---

## F3 — Tag taxonomy management

### US-011 — Inspect the tag vocabulary
**As a** librarian **I want** to run `tags` **so that** I see all tags and their frequencies and detect synonyms/typos.
- **Tool:** `tags` · **Feature:** F3
- **Acceptance:**
  - Lists a `[tag, count]` histogram sorted by frequency (alphabetical tie-break).
  - `--all` aggregates the whole vault; without the flag, current project + global.
  - `--json` returns `[{ tag, count }]`.

### US-012 — Add/remove tags from a note
**As a** teammate **I want** to run `tag <ref> --add "a,b" --remove "c"` **so that** I fix a note's taxonomy.
- **Tool:** `tag` · **Feature:** F3
- **Acceptance:**
  - Applies add/remove (CSV) over the resolved note; rewrites via `formatNote` preserving the other fields.
  - Does not duplicate already-present tags; removing a nonexistent tag is a silent no-op.
  - An ambiguous/nonexistent `<ref>` → clear message, exit 1, without writing.
  - Reports the final set of tags.

### US-013 — Rename a tag in bulk
**As a** librarian **I want** to run `retag <old> <new>` **so that** I consolidate a tag across all notes at once.
- **Tool:** `retag` · **Feature:** F3
- **Acceptance:**
  - Replaces `old` with `new` in every note that contains it; `--all` = all projects.
  - Notes without `old` stay intact; if `new` already exists in the note, it does not duplicate.
  - Reports how many notes were changed; preserves the rest of the frontmatter.

---

## F4 — Knowledge graph (wikilinks)

### US-014 — Discover what a note references
**As a** teammate **I want** to run `links <ref>` **so that** I see which notes it points to.
- **Tool:** `links` · **Feature:** F4
- **Acceptance:**
  - Extracts wikilinks from `related` + body (`wikilinksOf`); resolves each target to an existing note.
  - Marks broken links (nonexistent target) distinctly.
  - `--json` returns `{ source, links: [{ target, resolved }] }`.

### US-015 — Discover who references a note
**As a** teammate **I want** to run `backlinks <ref>` **so that** I see which notes depend on this one before changing/archiving it.
- **Tool:** `backlinks` · **Feature:** F4
- **Acceptance:**
  - Scans all notes and collects those that link to `<ref>` (by name/slug).
  - A `<ref>` with no backlinks → clear empty list, exit 0.
  - `--json` returns `{ target, backlinks: [name…] }`.

### US-016 — Visualize the knowledge graph
**As a** lead **I want** to run `graph` **so that** I see the vault's connection map as a diagram.
- **Tool:** `graph` · **Feature:** F4
- **Acceptance:**
  - Emits a **Mermaid** block (`flowchart`/`graph`) with nodes = notes and edges = wikilinks.
  - Nodes identified by the note name; directional edges (source → target).
  - `--json` returns `{ nodes: [...], edges: [{from,to}] }`.
  - Empty vault → valid empty graph (does not break).

### US-017 — Find orphan notes
**As a** librarian **I want** to run `orphans` **so that** I find notes with no connection and link or archive them.
- **Tool:** `orphans` · **Feature:** F4
- **Acceptance:**
  - Lists notes with no outgoing links **and** no backlinks.
  - `state` notes can be handled separately (they are not linkable knowledge) — decision documented in the executor's note.
  - `--json` returns `[{ name, type, file }]`.

---

## F5 — Vault analytics and reports

### US-018 — See vault statistics
**As a** lead **I want** to run `stats` **so that** I get an overview of the memory's volume and composition.
- **Tool:** `stats` · **Feature:** F5
- **Acceptance:**
  - Aggregates counts by type, by agent, by project and by tag; total notes and orphans.
  - `--all` = whole vault; without the flag, current project + global.
  - `--json` returns the complete aggregated object.

### US-019 — See the activity timeline
**As a** lead **I want** to run `timeline --since 2026-06-01` **so that** I audit what the team produced in a window.
- **Tool:** `timeline` · **Feature:** F5
- **Acceptance:**
  - Lists notes grouped/sorted by date; `--since` filters from a date; `--limit` caps the total.
  - Each entry shows date, type, agent and title.
  - `--json` returns `[{ date, name, type, agent }]`.

---

## F6 — Vault validation / lint

### US-020 — Validate the vault's integrity
**As a** maintainer **I want** to run `validate` **so that** I detect notes with broken frontmatter or dead links before trusting the vault.
- **Tool:** `validate` · **Feature:** F6
- **Acceptance:**
  - Reports: missing/invalid `type`, missing `summary`, wikilinks pointing to nonexistent notes, malformed tags.
  - **Exit code 1** when there is at least one error; exit 0 when clean.
  - `--all` validates all projects; `--json` returns `{ ok, errors: [{ file, rule, detail }] }`.
  - Runs as a gate in CI/hook (the exit code is the contract).

---

## F7 — Duplicate detection and cleanup

### US-021 — Detect duplicate notes
**As a** librarian **I want** to run `dedupe` **so that** I find near-identical notes and consolidate them.
- **Tool:** `dedupe` · **Feature:** F7
- **Acceptance:**
  - Groups notes by similarity (same slug/title, identical summary, or very similar body) and reports the groups.
  - Deletes nothing (only reports); indicates which one to keep as a suggestion.
  - `--json` returns `[{ group: [name…], reason }]`.

### US-022 — Clean vault noise safely
**As a** librarian **I want** to run `prune` **so that** I remove empty/placeholder notes from searches, but only after reviewing what will be affected.
- **Tool:** `prune` · **Feature:** F7
- **Acceptance:**
  - **Dry-run by default**: lists the candidates without touching the disk.
  - `--apply` is required to act; with it the candidates are **archived** to `_archive/` (not deleted — recoverable via `archive --restore`).
  - Explicit criteria: empty body after removing the `# title`, or still carrying the `save` template placeholder.
  - `--json` returns `{ candidates: [name…], applied: bool, movedCount: n }`.

---

## F8 — Note lifecycle

### US-023 — Archive and restore a note
**As a** librarian **I want** to run `archive <ref>` **so that** I remove an obsolete note from searches without losing it.
- **Tool:** `archive` · **Feature:** F8
- **Acceptance:**
  - Moves the note to `_archive/` of the same partition; `--restore` brings it back.
  - Archived notes leave `search`/`list` by default (only with `--archived`).
  - An ambiguous/nonexistent `<ref>` → clear error, exit 1, without moving.

### US-024 — Move a note between projects
**As a** lead **I want** to run `move <ref> <targetProject>` **so that** I relocate knowledge to the correct project.
- **Tool:** `move` · **Feature:** F8
- **Acceptance:**
  - Moves the file to the partition of `targetProject` (creating it if needed) and updates `project:` in the frontmatter.
  - Preserves content and the other fields via `formatNote`.
  - Reports the source and destination path; a nonexistent `<ref>` → error, exit 1.

### US-025 — Rename a note's title
**As a** teammate **I want** to run `rename <ref> <new title>` **so that** I fix the title and file name of a note.
- **Tool:** `rename` · **Feature:** F8
- **Acceptance:**
  - Updates the `# title` in the body and renames the file to the new slug (preserving the date prefix).
  - Does not break `summary` nor other fields; a name collision is resolved with a suffix.
  - Backlinks that pointed via the old name are reported as potentially broken.

---

## F9 — Backup and portability

### US-026 — Export the vault for backup/migration
**As a** maintainer **I want** to run `export` **so that** I move the memory to another machine or version it outside Obsidian.
- **Tool:** `export` · **Feature:** F9
- **Acceptance:**
  - `--format json` produces a single bundle with all notes + frontmatter; `--format md` produces a Markdown aggregate.
  - `--out file` writes to a file; without `--out`, emits to stdout.
  - `--all` = whole vault; without the flag, current project.
  - The export is rehydratable by `import` (round-trip without loss).

### US-027 — Import notes from a backup
**As a** maintainer **I want** to run `import <file> --project p` **so that** I rehydrate the memory into a new vault.
- **Tool:** `import` · **Feature:** F9
- **Acceptance:**
  - Reads a bundle generated by `export` and creates the notes in `--project` (or in the detected one).
  - Does not overwrite existing notes unnecessarily (resolves a collision with a suffix); reports how many it imported.
  - Frontmatter preserved; an invalid file → clear error, exit 1, nothing written.

---

## F10 — Structured JSON output (cross-cutting)

### US-028 — Consume output programmatically via `--json`
**As a** maintainer **I want** every read tool to accept `--json` **so that** I integrate the CLI with scripts, CI and other agents.
- **Tool:** all read ones · **Feature:** F10
- **Acceptance:**
  - With `--json`, the dispatcher emits **only** `res.data` as indented JSON (without the human `lines`).
  - The `data` of each read tool mirrors the information shown in `lines`.
  - JSON output is always parseable (tested with `JSON.parse`).

### US-029 — Chain tools in a pipeline
**As a** lead **I want** to combine tools with `--json` **so that** I automate flows (e.g.: `orphans --json` → archive each one).
- **Tool:** cross-cutting · **Feature:** F10
- **Acceptance:**
  - `orphans/list/search/stats` in `--json` produce arrays/objects consumable without parsing human text.
  - Exit codes are consistent (0 success, 1 error/validation) for use in `&&`/`||`.

---

## Integrity and quality (cross-cutting)

### US-030 — Ensure mutations do not corrupt notes
**As a** maintainer **I want** every tool that writes to preserve unknown frontmatter fields **so that** the vault survives schema evolutions.
- **Tool:** `tag`, `retag`, `move`, `rename`, `archive`, `import` · **Feature:** F3/F8/F9
- **Acceptance:**
  - A round-trip (read → mutate → rewrite) via `formatNote` keeps fields outside of `FM_ORDER` (ordered appendix).
  - A test with a seeded temporary vault (`seedNote`) confirms the preservation.

### US-031 — Do not destroy data without explicit confirmation
**As a** lead **I want** destructive operations to require an explicit flag **so that** I avoid accidental memory loss.
- **Tool:** `prune` (`--apply`), `archive` (moves, does not delete), `move`/`rename` (anti-clobber guard) · **Feature:** F7/F8
- **Acceptance:**
  - `prune` without `--apply` never touches the disk; with `--apply` it archives (does not delete).
  - `archive` moves to `_archive/` (recoverable), never deletes.
  - An ambiguous `<ref>` in any mutation aborts with an error instead of guessing.
  - `move`/`rename` abort if the destination name already belongs to another note (without overwriting).

### US-032 — Every new tool comes with tests
**As a** maintainer **I want** each tool to have `node:test` tests with a temporary vault **so that** the suite stays green and mock-free.
- **Tool:** cross-cutting (test harness) · **Feature:** F1
- **Acceptance:**
  - Each tool has an in-process happy path (`run`) + e2e via `runCli` when the dispatcher imports.
  - Covers nonexistent/ambiguous `<ref>`, empty vault and (when applicable) exit code and dry-run.
  - `npm test` passes entirely.

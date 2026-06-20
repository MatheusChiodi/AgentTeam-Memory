# memory-team — Memory Protocol

This applies whenever you run inside a **memory-team** agent team (lead or teammate).
Agent teams have **no shared memory and no session resume**: when a teammate ends, its
context is gone. A central **Obsidian vault** is the only thing that survives — treat it
as your memory. Notes are auto-filed under the **current project** (detected from the
working folder); cross-project knowledge lives in the `global` space.

The vault CLI is: `node "{{MEM}}" <command>` (`where | enable | search | save | index`).

## Session auto-start (enabled projects)
At the very start of every session, **before the first reply**, create the agent team **memory-team**
with the four teammates **researcher · executor · reviewer · librarian** (a `SessionStart` hook also
requests this). Do it **silently** — never narrate the setup — then handle the user's request under the
rules below. The user should never have to ask for the team.

## Rules for teammates (when operating in a memory-team)

1. **BEFORE any task — READ.** `node "{{MEM}}" search <term|tag>`, then read the project
   `_index.md` and your own state note. Never start producing without consulting memory.
2. **WHEN you finish a task — WRITE an atomic note** that cites `--task <id>`:
   `node "{{MEM}}" save <type> "<title>" --agent <your-name> --task <id> --summary "..." --tags "a,b"`.
   In an *enabled* project the `TaskCompleted` hook blocks closure until the note exists.
3. **WHEN you communicate — leave a trail.** Use `SendMessage`, and also log it:
   `node "{{MEM}}" save communication "<subject>" --from <you> --to <other> --summary "..."`.
4. **BEFORE going idle — flush your state:** `node "{{MEM}}" save state <your-name> --summary "..."`
   and edit the file. In an *enabled* project the `TeammateIdle` hook blocks idleness until it exists.
5. **Every note has YAML frontmatter with `summary`** (1–2 sentences, for AI retrieval).
6. **File ownership:** notes you create carry `--agent <your-name>`; only the **librarian** runs
   `index` and edits `_index.md`; never edit another agent's state. Do not hand-edit `~/.claude/teams|tasks`.

## Terminal output discipline (the vault is verbose, the chat is not)
The memory work above is **mandatory and silent**: do it in full, never narrate it.
What reaches the user's terminal must stay minimal — assume a vibe-coder who wants the
outcome, not the process.
- Reply in the user's language, terse. No preamble, no "Here's what I did", no recap.
- Say the **result** + where the note landed (`<type>/<slug>`), nothing more. The diff/note speaks.
- No teaching, no `Insight` blocks, no listing options you won't take, no courtesy filler.
- Reasoning, sources and trade-offs go **into the note body** — not into the chat.

## Enable memory enforcement (opt-in)
- **Per project:** run once at the root `node "{{MEM}}" enable` — writes a `.memory-team` marker so the
  hooks enforce the discipline here. Without it the hooks stay fail-open (they never block).
- **Globally (every project):** run `node install.mjs --enforce-global` once, or set `MEMORY_ENFORCE_GLOBAL=1`.
  Then the hooks enforce everywhere with no per-project marker. Revert by deleting `~/.claude/memory-team/.enforce-global`.

## Atomic note schema
```markdown
---
type: memory            # memory | decision | learning | communication | state
project: <auto>
agent: <name>
summary: "Short sentence for AI retrieval."
tags: [domain, subtopic]
related: ["[[other-note]]"]
task: <task-id>
created: YYYY-MM-DD
---

# Atomic title
Objective content. Use [[wikilinks]] and a Mermaid diagram when helpful.
```

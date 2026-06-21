// watch (F13 / US-038) — live tail of the vault. Long-running, so it deliberately
// steps OUTSIDE the `{ ok, lines, data }` contract every other command obeys: instead
// of returning a result, `run` streams a line to stdout for each NEW note created
// while it watches, and only resolves when the process receives SIGINT (Ctrl-C).
//
// Design for testability: the only logic worth covering — turning a note record into
// its printed line — is extracted into the PURE `formatWatchLine(note, dateLike)`.
// `run` is a thin orchestrator around `fs.watch` that reads each new file, parses its
// frontmatter into a note shape, and prints `formatWatchLine(...)`. Tests cover the
// pure function exhaustively and only smoke-test that the module exposes the contract;
// they must NOT call `run` (it would block until SIGINT).

import { watch as fsWatch } from 'node:fs';
import { basename } from 'node:path';
import { partition, globalPart, parseFM, listProjects } from '../lib.mjs';
import { readNote } from '../notes.mjs';

/** Two-digit `HH:MM` from a Date-like (Date, ms, or ISO string). */
function hhmm(dateLike) {
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Build the printed line for one new note. PURE — no fs, no clock.
 * @param {object} note  a record like `readNote` returns: { name, fm:{type,agent,summary}, ... }
 * @param {Date|number|string} dateLike  the event time (defaults to now at the call site)
 * @returns {string} `HH:MM type/agent — title` (+ ` — summary` when a summary is present)
 */
export function formatWatchLine(note, dateLike = new Date()) {
  const fm = (note && note.fm) || {};
  const type = fm.type || 'note';
  const agent = fm.agent || '?';
  // Title: prefer an explicit `# Heading` in the body, else the note's slug/basename.
  const title = headingOf(note) || note.name || 'untitled';
  const head = `${hhmm(dateLike)} ${type}/${agent} — ${title}`;
  const summary = (fm.summary || '').trim();
  return summary ? `${head} — ${summary}` : head;
}

/** First `# Heading` line of a note body, or '' when none. */
function headingOf(note) {
  const m = /^#\s+(.+)$/m.exec((note && note.body) || '');
  return m ? m[1].trim() : '';
}

/** Resolve which `memory/` dirs to watch for a given context. */
function watchDirs(ctx) {
  const { ROOT, PROJECT } = ctx;
  const dirs = [];
  if (ctx.all) {
    for (const p of listProjects(ROOT)) dirs.push(partition(ROOT, p).memory);
  } else {
    dirs.push(partition(ROOT, PROJECT).memory);
  }
  dirs.push(globalPart(ROOT).memory);
  return dirs;
}

/**
 * Long-running orchestrator. Returns a Promise that resolves on SIGINT.
 * NOTE: never call this from tests — it blocks until Ctrl-C.
 */
export function run(ctx) {
  const print = (ctx && ctx.print) || ((s) => console.log(s));
  const dirs = watchDirs(ctx);
  const seen = new Set();           // dedup: fs.watch fires twice per file on Windows
  const watchers = [];

  const where = ctx.all ? 'all projects + global' : `${ctx.PROJECT} + global`;
  print(`# watching ${where} — Ctrl-C to stop`);

  return new Promise((resolve) => {
    const stop = () => {
      for (const w of watchers) { try { w.close(); } catch { /* noop */ } }
      process.removeListener('SIGINT', stop);
      resolve({ ok: true, code: 0 });
    };

    for (const dir of dirs) {
      let w;
      try {
        w = fsWatch(dir, { persistent: true }, (event, filename) => {
          if (!filename) return;
          const name = String(filename);
          if (!name.endsWith('.md') || name === '_index.md') return;
          const file = `${dir}/${basename(name)}`;
          if (seen.has(file)) return;     // dedup duplicate FS events
          const note = readNote(file);
          if (!note) return;              // file gone / unreadable (e.g. transient write)
          seen.add(file);
          print(formatWatchLine(note, new Date()));
        });
      } catch { continue; }              // dir may not exist yet — skip silently
      watchers.push(w);
    }

    process.on('SIGINT', stop);
  });
}

export default {
  name: 'watch',
  summary: 'Live tail: print each new note as teammates write it (Ctrl-C to stop)',
  usage: 'watch [--all]',
  run,
};

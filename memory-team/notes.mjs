// notes.mjs — data-access layer over the vault, used by the CLI commands.
// Sits on top of lib.mjs (low-level path/frontmatter helpers). No external deps. ESM.
//
// Responsibilities:
//   - enumerate notes across project / global / (optionally) archive partitions
//   - parse a note into { file, fm, body } and resolve a note by a loose reference
//   - rebuild a note's text from { fm, body } using the canonical frontmatter order
//   - small shared utilities for the read/maintenance commands (tags, wikilinks)
//
// Nothing here calls console.log or process.exit — that belongs to the dispatcher —
// so every function is unit-testable in isolation.

import {
  readFileSync, existsSync, statSync,
} from 'node:fs';
import { join, basename, relative } from 'node:path';
import {
  partition, globalPart, walk, parseFM, listProjects, slug,
} from './lib.mjs';

// Canonical frontmatter key order (matches `save`). Unknown keys are appended, sorted.
export const FM_ORDER = ['type', 'project', 'agent', 'summary', 'tags', 'related', 'task', 'created'];

export const ARCHIVE_DIR = '_archive';

/** Path of a note relative to the vault root, with forward slashes. */
export function relOf(root, file) {
  return relative(root, file).replace(/\\/g, '/');
}

/** True when a path lives inside an `_archive` folder. */
export function isArchived(file) {
  return file.replace(/\\/g, '/').includes(`/${ARCHIVE_DIR}/`);
}

/** Parse one note file into a normalized record. Returns null when unreadable. */
export function readNote(file, root = null) {
  let raw;
  try { raw = readFileSync(file, 'utf8'); } catch { return null; }
  const { fm, body } = parseFM(raw);
  let mtime = 0;
  try { mtime = statSync(file).mtimeMs; } catch { /* noop */ }
  return {
    file,
    rel: root ? relOf(root, file) : file.replace(/\\/g, '/'),
    name: basename(file, '.md'),
    fm,
    body,
    raw,
    mtime,
    archived: isArchived(file),
    tags: Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []),
    created: fm.created || '',
  };
}

/**
 * Collect notes from the vault.
 * @param {string} root vault root
 * @param {object} opt
 *   - project: project name (default: none → use `projects` or all)
 *   - projects: explicit array of project names to scan
 *   - includeGlobal: also scan the global space (default true)
 *   - includeArchive: include `_archive` notes (default false)
 *   - all: scan every project partition (default false)
 * @returns {Array} note records
 */
export function collectNotes(root, opt = {}) {
  const {
    project, projects, includeGlobal = true, includeArchive = false, all = false,
  } = opt;

  const bases = [];
  if (all) {
    for (const p of listProjects(root)) bases.push(partition(root, p).base);
  } else if (Array.isArray(projects) && projects.length) {
    for (const p of projects) bases.push(partition(root, p).base);
  } else if (project) {
    bases.push(partition(root, project).base);
  }
  if (includeGlobal) bases.push(globalPart(root).base);

  const out = [];
  const seen = new Set();
  for (const base of bases) {
    for (const f of walk(base)) {
      if (seen.has(f)) continue;
      if (!includeArchive && isArchived(f)) continue;
      seen.add(f);
      const note = readNote(f, root);
      if (note) out.push(note);
    }
  }
  return out;
}

/**
 * Resolve a loose reference to note(s). A reference may be:
 *   - an exact basename (with or without `.md`)
 *   - a slug fragment / title substring (case-insensitive)
 * Returns every matching record (caller decides on ambiguity).
 */
export function resolveNotes(root, ref, opt = {}) {
  if (!ref) return [];
  const notes = collectNotes(root, { includeArchive: true, ...opt });
  const wanted = String(ref).replace(/\.md$/i, '').toLowerCase();
  const wantedSlug = slug(ref);

  const exact = notes.filter((n) => n.name.toLowerCase() === wanted);
  if (exact.length) return exact;

  const bySlug = notes.filter((n) => n.name.toLowerCase().includes(wantedSlug) && wantedSlug);
  if (bySlug.length) return bySlug;

  return notes.filter((n) => n.name.toLowerCase().includes(wanted)
    || (n.fm.summary || '').toLowerCase().includes(wanted));
}

/** Rebuild canonical note text from a parsed record's frontmatter + body. */
export function formatNote(fm, body) {
  const lines = ['---'];
  const emitted = new Set();
  const emit = (k, v) => {
    if (v == null || v === '') return;
    if (Array.isArray(v)) {
      const inner = v.map((x) => {
        const s = String(x);
        return s.startsWith('"') || s.startsWith('[') ? s : (k === 'related' ? `"${s}"` : s);
      }).join(', ');
      lines.push(`${k}: [${inner}]`);
    } else if (k === 'summary') {
      lines.push(`${k}: "${String(v).replace(/^"|"$/g, '').replace(/"/g, '\\"')}"`);
    } else {
      lines.push(`${k}: ${v}`);
    }
    emitted.add(k);
  };
  for (const k of FM_ORDER) if (k in fm) emit(k, fm[k]);
  for (const k of Object.keys(fm).sort()) if (!emitted.has(k)) emit(k, fm[k]);
  lines.push('---');
  const cleanBody = String(body || '').replace(/^\n+/, '');
  return `${lines.join('\n')}\n\n${cleanBody.replace(/\s+$/, '')}\n`;
}

/** Extract `[[wikilink]]` targets from a note (frontmatter related + body). */
export function wikilinksOf(note) {
  const set = new Set();
  const fromRelated = Array.isArray(note.fm.related) ? note.fm.related : [];
  for (const r of fromRelated) {
    const m = /\[\[([^\]]+)\]\]/.exec(r);
    if (m) set.add(m[1].trim());
    else if (r && !r.startsWith('[')) set.add(r.replace(/^"|"$/g, '').trim());
  }
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(note.body)) !== null) set.add(m[1].split('|')[0].trim());
  return [...set].filter(Boolean);
}

/** Count tag frequency across a set of notes. Returns a sorted [tag, count][]. */
export function tagHistogram(notes) {
  const counts = new Map();
  for (const n of notes) for (const t of n.tags) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

/** True if `file` still exists. */
export function noteExists(file) {
  return existsSync(file);
}

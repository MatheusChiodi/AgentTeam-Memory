// lib.mjs — shared memory-layer helpers for the memory-team system.
// Used by memory.mjs (CLI) and the hooks. No external dependencies. ESM.
//
// Central, per-project vault model:
//   <VAULT>/projects/<project>/{memory,board,agents,tasks}/
//   <VAULT>/global/{memory,board}/                            (cross-project space)
//   <VAULT>/projects/<project>/_index.md                      (per-project MOC)
//   <VAULT>/_index.md                                         (master MOC: lists projects)
//
// Resolution:
//   - vault root: env MEMORY_VAULT, else DEFAULT_VAULT.
//   - project:    env MEMORY_PROJECT, else slug(basename(cwd)).
//   - enabled:    a project is "enabled" (hooks enforce) iff a `.memory-team`
//                 marker file exists at its root, OR enforcement is global
//                 (env MEMORY_ENFORCE_GLOBAL=1, or a `.enforce-global` marker
//                 next to this module — written by `install.mjs --enforce-global`).

import {
  readdirSync, readFileSync, existsSync, mkdirSync, statSync,
} from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

// Universal default: lives next to the Claude Code config, works on any machine.
// Overridden by the MEMORY_VAULT env var (set by install.mjs in ~/.claude/settings.json).
export const DEFAULT_VAULT = join(homedir(), '.claude', 'memory-vault').replace(/\\/g, '/');
export const TYPES = ['memory', 'decision', 'learning', 'communication', 'state'];

export const stripBom = (s) => String(s).replace(/^﻿/, '');

export const slug = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60) || 'note';

export const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Deterministic UTC date math over YYYY-MM-DD strings (no Date.now → safe in tests).
// `today()` is the only clock-reading entrypoint; everything else derives from a given date.
export function addDays(dateStr, n) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + n);
  const p = (x) => String(x).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${p(dt.getUTCMonth() + 1)}-${p(dt.getUTCDate())}`;
}

/** Inclusive list of YYYY-MM-DD from `fromStr` to `toStr` (empty if inverted). */
export function dateRange(fromStr, toStr) {
  const out = [];
  if (!fromStr || !toStr || fromStr > toStr) return out;
  let cur = fromStr;
  while (cur <= toStr) { out.push(cur); cur = addDays(cur, 1); }
  return out;
}

/** Day of week for a YYYY-MM-DD string: 0=Sunday .. 6=Saturday (UTC). */
export function dayOfWeek(dateStr) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

export const getp = (o, keys) => {
  for (const k of keys) {
    const v = k.split('.').reduce((a, c) => (a == null ? a : a[c]), o);
    if (v != null && v !== '') return v;
  }
  return null;
};

export function vaultRoot() {
  return (process.env.MEMORY_VAULT || DEFAULT_VAULT).replace(/\\/g, '/').replace(/\/+$/, '');
}

export function projectName(cwd = process.cwd()) {
  if (process.env.MEMORY_PROJECT) return slug(process.env.MEMORY_PROJECT);
  const base = basename(cwd.replace(/\\/g, '/'));
  return base ? slug(base) : 'default';
}

export function projectDir(cwd = process.cwd()) {
  return cwd.replace(/\\/g, '/');
}

// Global enforcement marker lives next to this module, so it follows the install
// (works under any --home / sandbox), independent of homedir().
const GLOBAL_ENFORCE_MARKER = join(dirname(fileURLToPath(import.meta.url)), '.enforce-global');

// True when enforcement is on for EVERY project (no per-project marker needed).
export function enforceGlobal() {
  return process.env.MEMORY_ENFORCE_GLOBAL === '1' || existsSync(GLOBAL_ENFORCE_MARKER);
}

export function isEnabled(cwd = process.cwd()) {
  return enforceGlobal() || existsSync(join(cwd, '.memory-team'));
}

export function partition(root, project) {
  const base = join(root, 'projects', project);
  return {
    base,
    memory: join(base, 'memory'),
    board: join(base, 'board'),
    agents: join(base, 'agents'),
    tasks: join(base, 'tasks'),
    index: join(base, '_index.md'),
  };
}

export function globalPart(root) {
  const base = join(root, 'global');
  return { base, memory: join(base, 'memory'), board: join(base, 'board') };
}

export function ensure(...dirs) {
  for (const d of dirs) mkdirSync(d, { recursive: true });
}

export function ensurePartition(root, project) {
  const p = partition(root, project);
  ensure(p.memory, p.board, p.agents, p.tasks);
  const g = globalPart(root);
  ensure(g.memory, g.board);
  return p;
}

export function parseFM(text) {
  const clean = stripBom(text);
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(clean);
  if (!m) return { fm: {}, body: clean };
  const fm = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!mm) continue;
    let [, k, v] = mm;
    v = v.trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      fm[k] = v.slice(1, -1).split(',').map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    } else {
      fm[k] = v.replace(/^["']|["']$/g, '');
    }
  }
  return { fm, body: clean.slice(m[0].length) };
}

export function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md') && name !== '_index.md') out.push(p);
  }
  return out;
}

export function listProjects(root) {
  const dir = join(root, 'projects');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => {
    try { return statSync(join(dir, n)).isDirectory(); } catch { return false; }
  });
}

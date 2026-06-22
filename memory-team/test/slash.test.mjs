// slash.test.mjs — tests for the GLOBAL slash-command publishing path (install.mjs + slash.mjs).
//
// After a `/setup`, the whole 56-command CLI surface must be usable as /memory:<cmd> in ANY
// project, because Claude Code reads ~/.claude/commands/. install.mjs writes one <name>.md per
// registry command into <home>/.claude/commands/memory/. The portability requirement mirrors the
// statusLine one: every wrapper must call the PER-USER memory.mjs under <home>/.claude/memory-team/,
// derived from the target machine's homedir — NEVER the source repo the installer ran from.
//
// These run the REAL install.mjs as a subprocess against a throwaway HOME/VAULT (via --home/--vault),
// then inspect the .md files it generated. No mocks.
process.env.NO_COLOR = '1';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadCommands } from '../commands/registry.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const INSTALL = join(HERE, '..', '..', 'install.mjs');       // repo-root/install.mjs
const REPO_DIR = dirname(INSTALL);                           // the installer's own source tree
const SRC_MEM = join(REPO_DIR, 'memory-team', 'memory.mjs'); // the repo's memory.mjs (must NOT leak)

const norm = (p) => String(p).replace(/\\/g, '/');           // OS-agnostic path compare

// Throwaway HOME + VAULT pair so we never touch the real ~/.claude.
function sandbox() {
  const base = mkdtempSync(join(tmpdir(), 'mem-slash-'));
  return {
    base,
    home: join(base, 'home'),
    vault: join(base, 'vault'),
    slashDir: join(base, 'home', '.claude', 'commands', 'memory'),
    perUserMem: norm(join(base, 'home', '.claude', 'memory-team', 'memory.mjs')),
  };
}
const wipe = (s) => { try { rmSync(s.base, { recursive: true, force: true }); } catch { /* noop */ } };

const runInstall = (s, extra = []) =>
  execFileSync(process.execPath, [INSTALL, '--home', s.home, '--vault', s.vault, ...extra],
    { encoding: 'utf8' });

const mdFiles = (dir) =>
  (existsSync(dir) ? readdirSync(dir) : []).filter((f) => f.endsWith('.md'));

// ── S1 — one .md per registry command, count matches loadCommands().size ───────────
test('S1: writes one /memory:<cmd>.md per registry command', async () => {
  const s = sandbox();
  try {
    runInstall(s);
    const cmds = await loadCommands();
    const files = mdFiles(s.slashDir);
    assert.equal(files.length, cmds.size,
      `expected ${cmds.size} .md files, got ${files.length}`);
    for (const name of cmds.keys()) {
      assert.ok(existsSync(join(s.slashDir, `${name}.md`)),
        `missing slash command file for "${name}"`);
    }
  } finally {
    wipe(s);
  }
});

// ── S2 — every wrapper targets the PER-USER memory.mjs, never the source repo ───────
test('S2: every .md calls the per-user memory.mjs and never embeds the repo source path', () => {
  const s = sandbox();
  try {
    runInstall(s);
    const files = mdFiles(s.slashDir);
    assert.ok(files.length > 0, 'expected generated slash commands');
    for (const f of files) {
      const body = norm(readFileSync(join(s.slashDir, f), 'utf8'));
      assert.ok(body.includes(s.perUserMem),
        `${f} must reference the per-user memory.mjs (${s.perUserMem})`);
      assert.ok(!body.includes(norm(SRC_MEM)),
        `${f} must NOT embed the installer source memory.mjs path`);
    }
  } finally {
    wipe(s);
  }
});

// ── S3 — idempotent: a 2nd install keeps exactly one .md per command ────────────────
test('S3: idempotent — second install keeps one .md per command', async () => {
  const s = sandbox();
  try {
    runInstall(s);
    runInstall(s);
    const cmds = await loadCommands();
    const files = mdFiles(s.slashDir);
    assert.equal(files.length, cmds.size,
      'a second run must not duplicate or drop slash command files');
  } finally {
    wipe(s);
  }
});

// ── S4 — non-destructive: a user's own ~/.claude/commands/*.md survives; namespace added ─
test('S4: non-destructive — a pre-existing custom command survives, memory namespace added beside it', () => {
  const s = sandbox();
  try {
    const commandsDir = join(s.home, '.claude', 'commands');
    mkdirSync(commandsDir, { recursive: true });
    const mine = join(commandsDir, 'my-own.md');
    const mineBody = '---\ndescription: my own command\n---\nRun: my thing\n';
    writeFileSync(mine, mineBody, 'utf8');

    runInstall(s);

    assert.ok(existsSync(mine), 'a user-authored command must survive install');
    assert.equal(readFileSync(mine, 'utf8'), mineBody, 'and remain byte-for-byte intact');
    assert.ok(existsSync(s.slashDir), 'the commands/memory/ namespace must be added beside it');
    assert.ok(mdFiles(s.slashDir).length > 0, 'with the generated wrappers inside');
  } finally {
    wipe(s);
  }
});

// ── S5 — frontmatter must be valid YAML: argument-hint/description are SINGLE nodes ──
// The bug this guards against: a flow-seq or quoted scalar followed by MORE content
// (`[--a] [--b]`, `"<g>" [--s]`) parses as two YAML nodes → a real parse error → Claude Code
// silently DROPS the command. Curated .md prompts are copied near-verbatim, so a lax source
// frontmatter would leak straight through to the published wrapper.
function validYamlScalar(v) {
  v = v.trim();
  if (v === '') return true;
  if (v[0] === '"') return /^"(?:[^"\\]|\\.)*"$/.test(v);  // one balanced double-quoted string
  if (v[0] === "'") return /^'(?:[^']|'')*'$/.test(v);     // one balanced single-quoted string
  if (v[0] === '[') return /^\[[^[\]]*\]$/.test(v);        // one flat flow-seq, nothing after
  if (v[0] === '{') return /^\{[^{}]*\}$/.test(v);         // one flat flow-map, nothing after
  return !/:\s/.test(v) && !/^[!&*]/.test(v);              // plain scalar: no mapping ': ', no reserved indicator
}

test('S5: every wrapper has valid YAML frontmatter (no command silently dropped)', () => {
  const s = sandbox();
  try {
    runInstall(s);
    const files = mdFiles(s.slashDir);
    assert.ok(files.length > 0, 'expected generated slash commands');
    for (const f of files) {
      const raw = readFileSync(join(s.slashDir, f), 'utf8');
      const m = raw.match(/^---\n([\s\S]*?)\n---/);
      assert.ok(m, `${f} must open with a frontmatter block`);
      for (const line of m[1].split('\n')) {
        const kv = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
        if (!kv) continue;
        assert.ok(validYamlScalar(kv[2]),
          `${f}: "${kv[1]}" is not a single valid YAML node: ${JSON.stringify(kv[2])}`);
      }
    }
  } finally {
    wipe(s);
  }
});

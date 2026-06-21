// install.test.mjs — tests for the `/setup` install path (install.mjs).
//
// `/setup` runs `node install.mjs`. Beyond copying the runtime and wiring env + hooks,
// install.mjs must ALSO register the F11 statusLine — the "realtime-usage" line that
// renders `plan │ ctx │ $ │ model │ mem`. The key portability requirement: the command
// it writes must point at the PER-USER copy under <home>/.claude/memory-team/, derived
// from the target machine's homedir — NEVER at the source repo the installer happened to
// run from. That is what makes a `/setup` work on anyone's computer, not just the author's.
//
// These tests run the REAL install.mjs as a subprocess against a throwaway HOME/VAULT
// (via --home/--vault), then inspect the settings.json it generated. No mocks.
process.env.NO_COLOR = '1';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync, rmSync, mkdirSync, writeFileSync, readFileSync, existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const INSTALL = join(HERE, '..', '..', 'install.mjs');       // repo-root/install.mjs
const STATUSLINE = join(HERE, '..', 'statusline.mjs');       // memory-team/statusline.mjs
const MEMORY_CLI = join(HERE, '..', 'memory.mjs');           // memory-team/memory.mjs
const REPO_DIR = dirname(INSTALL);                           // the installer's own source tree

const norm = (p) => String(p).replace(/\\/g, '/');           // OS-agnostic path compare

// Throwaway HOME + VAULT pair so we never touch the real ~/.claude.
function sandbox() {
  const base = mkdtempSync(join(tmpdir(), 'mem-install-'));
  return {
    base,
    home: join(base, 'home'),
    vault: join(base, 'vault'),
    settingsPath: join(base, 'home', '.claude', 'settings.json'),
  };
}
const wipe = (s) => { try { rmSync(s.base, { recursive: true, force: true }); } catch { /* noop */ } };

// Run install.mjs against a sandbox HOME/VAULT — exactly what `/setup` does, but pointed
// at a temp homedir so the assertions exercise a fresh, per-user install on "any machine".
const runInstall = (s, extra = []) =>
  execFileSync(process.execPath, [INSTALL, '--home', s.home, '--vault', s.vault, ...extra],
    { encoding: 'utf8' });

// Run `statusline.mjs --install`. It uses os.homedir() (no --home flag), so we redirect it
// by overriding USERPROFILE (Windows) and HOME (*nix) for the child process.
const runStatuslineInstall = (s) =>
  execFileSync(process.execPath, [STATUSLINE, '--install'], {
    encoding: 'utf8',
    env: { ...process.env, USERPROFILE: s.home, HOME: s.home },
  });

const readSettings = (s) => JSON.parse(readFileSync(s.settingsPath, 'utf8'));

// ── Suite A — install.mjs (the thing `/setup` executes) ────────────────────────────

test('A1: install.mjs copies the statusline.mjs binary into <home>/.claude/memory-team', () => {
  const s = sandbox();
  try {
    runInstall(s);
    const copied = join(s.home, '.claude', 'memory-team', 'statusline.mjs');
    assert.ok(existsSync(copied), 'statusline.mjs should be copied by the dynamic *.mjs scan');
  } finally {
    wipe(s);
  }
});

test('A2: install.mjs registers settings.statusLine pointing at the copied script', () => {
  const s = sandbox();
  try {
    runInstall(s);
    const { statusLine } = readSettings(s);
    assert.ok(statusLine, 'statusLine block must be written by /setup');
    assert.equal(statusLine.type, 'command');
    assert.equal(statusLine.padding, 0);
    assert.ok(norm(statusLine.command).includes('/.claude/memory-team/statusline.mjs'),
      'command must reference the copied per-user script');
  } finally {
    wipe(s);
  }
});

test('A3: install.mjs registers env flags + 3 hooks + statusLine together', () => {
  const s = sandbox();
  try {
    runInstall(s);
    const settings = readSettings(s);
    assert.equal(settings.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS, '1');
    assert.ok(settings.env.MEMORY_VAULT, 'MEMORY_VAULT must be set');

    const hookCmds = (event) =>
      (settings.hooks[event] || []).flatMap((g) => (g.hooks || []).map((h) => h.command));
    assert.ok(hookCmds('TaskCompleted').some((c) => c.includes('task-completed.mjs')));
    assert.ok(hookCmds('TeammateIdle').some((c) => c.includes('teammate-idle.mjs')));
    assert.ok(hookCmds('SessionStart').some((c) => c.includes('session-start.mjs')));
    // The statusLine is now wired in the same pass — no separate manual step required.
    assert.ok(settings.statusLine, 'statusLine must be wired alongside the hooks');
  } finally {
    wipe(s);
  }
});

test('A4: install.mjs is idempotent — 2nd run keeps one statusLine and no duplicate hooks', () => {
  const s = sandbox();
  try {
    runInstall(s);
    const first = readSettings(s).statusLine.command;
    runInstall(s); // second run on the same HOME
    const settings = readSettings(s);

    assert.equal(settings.statusLine.command, first, 'statusLine command is stable across runs');

    const count = (event, needle) =>
      (settings.hooks[event] || [])
        .flatMap((g) => (g.hooks || []).map((h) => h.command))
        .filter((c) => c.includes(needle)).length;
    assert.equal(count('TaskCompleted', 'task-completed.mjs'), 1);
    assert.equal(count('TeammateIdle', 'teammate-idle.mjs'), 1);
    assert.equal(count('SessionStart', 'session-start.mjs'), 1);
  } finally {
    wipe(s);
  }
});

test('A5: statusLine path is portable — derived from target HOME, never the source repo', () => {
  const s = sandbox();
  try {
    runInstall(s);
    const cmd = norm(readSettings(s).statusLine.command);
    // Points inside the target machine's home (where the install just copied the runtime)…
    assert.ok(cmd.includes(norm(s.home) + '/.claude/memory-team/statusline.mjs'),
      'command must resolve under the installing user\'s home, so it works on any machine');
    // …and never hardcodes the repo the installer ran from (which would not exist elsewhere).
    assert.ok(!cmd.includes(norm(REPO_DIR)),
      'command must NOT embed the installer source path');
    // Forward slashes only → one command string that parses on Windows and *nix alike.
    assert.ok(!cmd.includes('\\'), 'command must use forward slashes for cross-OS portability');
  } finally {
    wipe(s);
  }
});

test('A6: install.mjs is non-destructive — a user\'s custom statusLine is left intact', () => {
  const s = sandbox();
  try {
    // Pre-seed a settings.json carrying a custom statusLine unrelated to memory-team.
    mkdirSync(dirname(s.settingsPath), { recursive: true });
    const custom = { type: 'command', command: 'node "/opt/my/own/status.mjs"', padding: 2 };
    writeFileSync(s.settingsPath, JSON.stringify({ statusLine: custom }), 'utf8');

    runInstall(s);

    const { statusLine } = readSettings(s);
    assert.deepEqual(statusLine, custom, 'a third-party statusLine must not be clobbered');
  } finally {
    wipe(s);
  }
});

// ── Suite B — statusline.mjs --install (the standalone manual path still works) ─────

test('B1: statusline.mjs --install writes a valid, forward-slashed statusLine block', () => {
  const s = sandbox();
  try {
    // install() aborts on invalid JSON but works if the file is absent or valid; pre-create
    // an empty settings.json to exercise the "merge into existing" branch.
    mkdirSync(dirname(s.settingsPath), { recursive: true });
    writeFileSync(s.settingsPath, '{}', 'utf8');

    runStatuslineInstall(s);

    const { statusLine } = readSettings(s);
    assert.ok(statusLine, 'statusLine block must now exist');
    assert.equal(statusLine.type, 'command');
    assert.ok(statusLine.command.includes('statusline.mjs'));
    assert.ok(!statusLine.command.includes('\\'), 'command must be forward-slashed');
    assert.equal(statusLine.padding, 0);
  } finally {
    wipe(s);
  }
});

// ── Suite C — doctor confirms the wiring end-to-end ────────────────────────────────
// doctor accepts `--settings <path>` and `--json` (prints res.data = { ok, checks }).
// The `statusline` check is `ok` when settings.statusLine points at an existing script.

const statuslineCheck = (s) => {
  const out = execFileSync(
    process.execPath,
    [MEMORY_CLI, 'doctor', '--settings', s.settingsPath, '--json'],
    { encoding: 'utf8', env: { ...process.env, MEMORY_VAULT: s.vault, MEMORY_PROJECT: 'testproj' } },
  );
  return JSON.parse(out).checks.find((c) => c.name === 'statusline');
};

test('C1: doctor reports statusline=ok immediately after /setup (no manual step needed)', () => {
  const s = sandbox();
  try {
    runInstall(s);
    const check = statuslineCheck(s);
    assert.equal(check.status, 'ok',
      'after /setup the statusLine check is green — the script is wired and present on disk');
  } finally {
    wipe(s);
  }
});

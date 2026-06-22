// vault.test.mjs — tests for the configurable vault path in /setup (install.mjs).
//
// The central vault is the only thing that survives across agent-team sessions, so a re-run of
// /setup must NOT reset a custom location. Resolution cascade:
//   --vault <dir>  >  settings.env.MEMORY_VAULT (the prior choice)  >  DEFAULT_VAULT.
// And moving the vault must MIGRATE the notes non-destructively (copy, old kept intact, no
// overwrite of files already in the new location).
//
// Real install.mjs as a subprocess against a throwaway HOME (via --home). No mocks.
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
const INSTALL = join(HERE, '..', '..', 'install.mjs');

const norm = (p) => String(p).replace(/\\/g, '/');

function sandbox() {
  const base = mkdtempSync(join(tmpdir(), 'mem-vault-'));
  return {
    base,
    home: join(base, 'home'),
    settingsPath: join(base, 'home', '.claude', 'settings.json'),
  };
}
const wipe = (s) => { try { rmSync(s.base, { recursive: true, force: true }); } catch { /* noop */ } };

// runInstall WITHOUT a forced --vault unless caller passes one — we want to exercise the cascade.
const runInstall = (s, extra = []) =>
  execFileSync(process.execPath, [INSTALL, '--home', s.home, ...extra], { encoding: 'utf8' });

const readMemoryVault = (s) =>
  norm(JSON.parse(readFileSync(s.settingsPath, 'utf8')).env.MEMORY_VAULT);

// ── V1 — re-setup keeps a previously chosen custom vault (cascade falls back to settings) ──
test('V1: re-setup without --vault keeps the prior custom MEMORY_VAULT', () => {
  const s = sandbox();
  try {
    const custom = join(s.base, 'my-custom-vault');
    runInstall(s, ['--vault', custom]);          // first install pins a custom location
    assert.equal(readMemoryVault(s), norm(custom));

    runInstall(s);                                // re-setup with NO --vault
    assert.equal(readMemoryVault(s), norm(custom),
      're-running /setup must not reset the vault to the default');
  } finally {
    wipe(s);
  }
});

// ── V2 — an explicit --vault overrides the prior choice ───────────────────────────────────
test('V2: explicit --vault overrides the prior MEMORY_VAULT', () => {
  const s = sandbox();
  try {
    const first = join(s.base, 'vault-a');
    const second = join(s.base, 'vault-b');
    runInstall(s, ['--vault', first]);
    assert.equal(readMemoryVault(s), norm(first));

    runInstall(s, ['--vault', second]);
    assert.equal(readMemoryVault(s), norm(second),
      'a fresh --vault must win over the recovered prior location');
  } finally {
    wipe(s);
  }
});

// ── V3 — moving the vault MIGRATES notes non-destructively (copy; old intact; no overwrite) ─
test('V3: changing location copies prior notes, keeps the old vault, never overwrites', () => {
  const s = sandbox();
  try {
    const oldV = join(s.base, 'vault-old');
    const newV = join(s.base, 'vault-new');

    runInstall(s, ['--vault', oldV]);
    // seed a note in the old vault
    const noteRel = join('projects', 'demo', 'memory', 'note.md');
    mkdirSync(dirname(join(oldV, noteRel)), { recursive: true });
    writeFileSync(join(oldV, noteRel), 'OLD-NOTE', 'utf8');

    // pre-create a colliding file in the NEW vault to prove non-overwrite
    mkdirSync(dirname(join(newV, noteRel)), { recursive: true });
    writeFileSync(join(newV, noteRel), 'PRE-EXISTING', 'utf8');

    runInstall(s, ['--vault', newV]);

    // migrated note exists in new vault…
    assert.ok(existsSync(join(newV, noteRel)), 'note must be present in the new vault');
    // …but the pre-existing colliding file was NOT overwritten…
    assert.equal(readFileSync(join(newV, noteRel), 'utf8'), 'PRE-EXISTING',
      'migration must not overwrite files already in the new vault');
    // …and the OLD vault is left intact.
    assert.equal(readFileSync(join(oldV, noteRel), 'utf8'), 'OLD-NOTE',
      'the old vault must be kept intact after migration');
    assert.equal(readMemoryVault(s), norm(newV));
  } finally {
    wipe(s);
  }
});

// ── V4 — --print-vault resolves the cascade and prints WITHOUT installing ──────────────────
test('V4: --print-vault prints the resolved path and does not install', () => {
  const s = sandbox();
  try {
    const custom = join(s.base, 'printed-vault');
    runInstall(s, ['--vault', custom]);          // pin a known prior choice

    // print-vault on a fresh sandbox HOME that already has settings → echoes the prior choice
    const out = execFileSync(process.execPath,
      [INSTALL, '--home', s.home, '--print-vault'], { encoding: 'utf8' }).trim();
    assert.equal(norm(out), norm(custom), '--print-vault echoes the cascade result');
  } finally {
    wipe(s);
  }
});

// ── V5 — default vault when there is no prior choice and no --vault ────────────────────────
test('V5: with no prior choice and no --vault, falls back to the default under HOME', () => {
  const s = sandbox();
  try {
    runInstall(s);
    assert.equal(readMemoryVault(s), norm(join(s.home, '.claude', 'memory-vault')),
      'a first-time install with no flag uses the universal default');
  } finally {
    wipe(s);
  }
});

// ── V6 — moving the vault INTO a subdir of itself must not crash (cpSync would recurse) ─────
// Regression for the ERR_FS_CP_EINVAL the reviewer caught: A → A/sub made cpSync recurse into
// its own copy target and throw, AFTER settings already pointed at the empty A/sub → a partial
// install. Now the nested case is skipped and the install completes a valid, scaffolded vault.
test('V6: installing into a subdir of the old vault does not crash and stays consistent', () => {
  const s = sandbox();
  try {
    const oldV = join(s.base, 'vault-nest');
    const subV = join(oldV, 'sub');

    runInstall(s, ['--vault', oldV]);
    const noteRel = join('projects', 'demo', 'memory', 'note.md');
    mkdirSync(dirname(join(oldV, noteRel)), { recursive: true });
    writeFileSync(join(oldV, noteRel), 'OLD-NOTE', 'utf8');

    // execFileSync throws on a non-zero exit — so this asserts the install did NOT crash.
    assert.doesNotThrow(() => runInstall(s, ['--vault', subV]),
      'installing into a subdir of the old vault must not abort');

    assert.equal(readMemoryVault(s), norm(subV));
    assert.ok(existsSync(join(subV, 'global', 'memory', 'memory-team-bootstrap.md')),
      'the nested vault must be fully scaffolded — never a half-written install');
    assert.equal(readFileSync(join(oldV, noteRel), 'utf8'), 'OLD-NOTE',
      'the old vault stays intact (nested migration is skipped, not destructive)');
  } finally {
    wipe(s);
  }
});

// ── V7 — a settings.json carrying a UTF-8 BOM is parsed, not clobbered ──────────────────────
test('V7: re-setup tolerates a UTF-8 BOM in settings.json and keeps the prior vault', () => {
  const s = sandbox();
  try {
    const custom = join(s.base, 'bom-vault');
    runInstall(s, ['--vault', custom]);
    writeFileSync(s.settingsPath, `﻿${readFileSync(s.settingsPath, 'utf8')}`, 'utf8');

    assert.doesNotThrow(() => runInstall(s), 'a BOM must not break the settings read');
    assert.equal(readMemoryVault(s), norm(custom), 'the prior vault survives the BOM');
  } finally {
    wipe(s);
  }
});

// ── V8 — an invalid settings.json aborts WITHOUT clobbering the user's file ─────────────────
test('V8: invalid settings.json aborts the install and leaves the file untouched', () => {
  const s = sandbox();
  try {
    mkdirSync(dirname(s.settingsPath), { recursive: true });
    const garbage = '{ not valid json ';
    writeFileSync(s.settingsPath, garbage, 'utf8');

    assert.throws(() => runInstall(s, ['--vault', join(s.base, 'x')]),
      'install must exit non-zero rather than clobber an unparseable settings.json');
    assert.equal(readFileSync(s.settingsPath, 'utf8'), garbage,
      'the invalid settings.json must be left exactly as it was');
  } finally {
    wipe(s);
  }
});

// ── V9 — migration copies a DEEP note tree wholesale ────────────────────────────────────────
test('V9: migration copies a deeply nested note tree intact', () => {
  const s = sandbox();
  try {
    const oldV = join(s.base, 'deep-old');
    const newV = join(s.base, 'deep-new');

    runInstall(s, ['--vault', oldV]);
    const deepRel = join('projects', 'p', 'memory', 'a', 'b', 'c', 'deep.md');
    mkdirSync(dirname(join(oldV, deepRel)), { recursive: true });
    writeFileSync(join(oldV, deepRel), 'DEEP', 'utf8');

    runInstall(s, ['--vault', newV]);
    assert.equal(readFileSync(join(newV, deepRel), 'utf8'), 'DEEP',
      'a deeply nested note must survive migration');
  } finally {
    wipe(s);
  }
});

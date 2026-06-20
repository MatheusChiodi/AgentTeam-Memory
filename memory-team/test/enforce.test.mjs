// enforce.test.mjs — the enforcement gate: per-project marker OR global override.
// The on-disk `.enforce-global` marker lives next to lib.mjs, so we exercise the
// global branch through the env override (same OR branch) to avoid touching the repo.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isEnabled, enforceGlobal } from '../lib.mjs';

const ENV = 'MEMORY_ENFORCE_GLOBAL';
afterEach(() => { delete process.env[ENV]; });

function tmp() { return mkdtempSync(join(tmpdir(), 'mem-enforce-')); }

test('isEnabled: false in a bare project (no marker, no global)', () => {
  const dir = tmp();
  try {
    delete process.env[ENV];
    assert.equal(enforceGlobal(), false);
    assert.equal(isEnabled(dir), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('isEnabled: true with a per-project .memory-team marker', () => {
  const dir = tmp();
  try {
    writeFileSync(join(dir, '.memory-team'), 'project: x\n', 'utf8');
    assert.equal(isEnabled(dir), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('global override: MEMORY_ENFORCE_GLOBAL=1 enables every project', () => {
  const dir = tmp();
  try {
    process.env[ENV] = '1';
    assert.equal(enforceGlobal(), true);
    assert.equal(isEnabled(dir), true); // enabled even with no per-project marker
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('global override: any value other than "1" does not enable', () => {
  const dir = tmp();
  try {
    process.env[ENV] = '0';
    assert.equal(enforceGlobal(), false);
    assert.equal(isEnabled(dir), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// config.test.mjs — F16 config tool: list/get/set round-trip, persistence,
// defaults, unknown-key handling, type coercion, --json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { run, makeVault, cleanup } from './_helpers.mjs';
import { DEFAULTS, loadConfig } from '../commands/config.mjs';

test('set → get round-trip returns the persisted value', async () => {
  const root = makeVault();
  try {
    await run('config', { root, pos: ['set', 'statusline.warn', '55'] });
    const res = await run('config', { root, pos: ['get', 'statusline.warn'] });
    assert.equal(res.ok, true);
    assert.equal(res.lines[0], '55');
  } finally { cleanup(root); }
});

test('list shows built-in defaults when no config.json exists', async () => {
  const root = makeVault();
  try {
    const res = await run('config', { root, pos: ['list'] });
    assert.equal(res.ok, true);
    // data is the effective config object: every default key present.
    for (const k of Object.keys(DEFAULTS)) {
      assert.equal(res.data[k], DEFAULTS[k]);
    }
    // origins are marked as default
    assert.ok(res.lines.some((l) => l.includes('statusline.warn = 70 (default)')));
  } finally { cleanup(root); }
});

test('no subcommand defaults to list', async () => {
  const root = makeVault();
  try {
    const res = await run('config', { root, pos: [] });
    assert.equal(res.ok, true);
    assert.deepEqual(res.data, DEFAULTS);
  } finally { cleanup(root); }
});

test('set persists to config.json and overrides the default', async () => {
  const root = makeVault();
  try {
    await run('config', { root, pos: ['set', 'statusline.danger', '95'] });
    const file = join(root, 'config.json');
    assert.ok(existsSync(file), 'config.json should be created');
    const onDisk = JSON.parse(readFileSync(file, 'utf8'));
    assert.equal(onDisk['statusline.danger'], 95);
    // effective config reflects the override; loadConfig agrees
    const eff = loadConfig(root);
    assert.equal(eff['statusline.danger'], 95);
    // list marks it as override
    const res = await run('config', { root, pos: ['list'] });
    assert.ok(res.lines.some((l) => l.includes('statusline.danger = 95 (override)')));
  } finally { cleanup(root); }
});

test('set merges non-destructively (keeps prior overrides)', async () => {
  const root = makeVault();
  try {
    await run('config', { root, pos: ['set', 'statusline.warn', '60'] });
    await run('config', { root, pos: ['set', 'statusline.danger', '80'] });
    const onDisk = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));
    assert.equal(onDisk['statusline.warn'], 60);
    assert.equal(onDisk['statusline.danger'], 80);
  } finally { cleanup(root); }
});

test('get of an unknown key returns empty, ok, no error', async () => {
  const root = makeVault();
  try {
    const res = await run('config', { root, pos: ['get', 'does.not.exist'] });
    assert.equal(res.ok, true);
    assert.equal(res.code, undefined);
    assert.equal(res.lines[0], '');
  } finally { cleanup(root); }
});

test('type coercion: numeric string → number', async () => {
  const root = makeVault();
  try {
    await run('config', { root, pos: ['set', 'statusline.barWidth', '14'] });
    const onDisk = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));
    assert.strictEqual(onDisk['statusline.barWidth'], 14);
    assert.equal(typeof onDisk['statusline.barWidth'], 'number');
  } finally { cleanup(root); }
});

test('type coercion: "true"/"false" → boolean', async () => {
  const root = makeVault();
  try {
    await run('config', { root, pos: ['set', 'feature.flag', 'true'] });
    await run('config', { root, pos: ['set', 'feature.off', 'false'] });
    const onDisk = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));
    assert.strictEqual(onDisk['feature.flag'], true);
    assert.strictEqual(onDisk['feature.off'], false);
  } finally { cleanup(root); }
});

test('type coercion: non-numeric string stays a string', async () => {
  const root = makeVault();
  try {
    await run('config', { root, pos: ['set', 'date.format', 'DD/MM/YYYY'] });
    const onDisk = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));
    assert.strictEqual(onDisk['date.format'], 'DD/MM/YYYY');
  } finally { cleanup(root); }
});

test('set of an unknown key is accepted but warned', async () => {
  const root = makeVault();
  try {
    const res = await run('config', { root, pos: ['set', 'custom.key', '1'] });
    assert.equal(res.ok, true);
    assert.ok(res.lines.some((l) => l.toLowerCase().includes('warning')));
    const onDisk = JSON.parse(readFileSync(join(root, 'config.json'), 'utf8'));
    assert.equal(onDisk['custom.key'], 1);
  } finally { cleanup(root); }
});

test('--json on get returns the whole effective config object', async () => {
  const root = makeVault();
  try {
    await run('config', { root, pos: ['set', 'statusline.warn', '50'] });
    const res = await run('config', { root, pos: ['get', 'statusline.warn'], opt: { json: true } });
    assert.equal(res.ok, true);
    assert.equal(res.data['statusline.warn'], 50);
    // a full object, not just the one key
    assert.equal(res.data['statusline.danger'], DEFAULTS['statusline.danger']);
  } finally { cleanup(root); }
});

test('--json on list returns the effective config object', async () => {
  const root = makeVault();
  try {
    const res = await run('config', { root, pos: ['list'], opt: { json: true } });
    assert.equal(res.ok, true);
    assert.deepEqual(res.data, DEFAULTS);
  } finally { cleanup(root); }
});

test('unknown subcommand fails with exit 1', async () => {
  const root = makeVault();
  try {
    const res = await run('config', { root, pos: ['bogus'] });
    assert.equal(res.ok, false);
    assert.equal(res.code, 1);
  } finally { cleanup(root); }
});

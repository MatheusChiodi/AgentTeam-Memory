import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
beforeEach(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'first', tags: ['t1', 't2'], created: '2026-01-01' }, 'body a [[2026-01-02-b]]');
  seedNote(root, 'testproj', 'memory', '2026-01-02-b.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'second', tags: ['t1'], created: '2026-01-02' }, 'body b');
  seedNote(root, 'testproj', 'memory', '2026-01-03-amb.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'amb', tags: ['t1'], created: '2026-01-03' }, 'amb');
});
afterEach(() => cleanup(root));

test('pin: marks a note pinned on disk', async () => {
  const res = await run('pin', { pos: ['2026-01-01-a'], root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, { name: '2026-01-01-a', pinned: true });
  const txt = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-a.md'), 'utf8');
  assert.match(txt, /^pinned: true$/m);
});

test('pin: is idempotent (pinning twice keeps a single flag)', async () => {
  await run('pin', { pos: ['2026-01-01-a'], root });
  await run('pin', { pos: ['2026-01-01-a'], root });
  const txt = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-a.md'), 'utf8');
  assert.equal((txt.match(/^pinned: true$/gm) || []).length, 1);
});

test('pin: --off removes the flag', async () => {
  await run('pin', { pos: ['2026-01-01-a'], root });
  const res = await run('pin', { pos: ['2026-01-01-a'], opt: { off: true }, root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, { name: '2026-01-01-a', pinned: false });
  const txt = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-a.md'), 'utf8');
  assert.doesNotMatch(txt, /pinned:/);
});

test('pin: --list shows only pinned notes', async () => {
  await run('pin', { pos: ['2026-01-01-a'], root });
  await run('pin', { pos: ['2026-01-02-b'], root });
  const res = await run('pin', { opt: { list: true }, root });
  assert.equal(res.ok, true);
  const names = res.data.map((d) => d.name).sort();
  assert.deepEqual(names, ['2026-01-01-a', '2026-01-02-b']);
  assert.ok(res.data.every((d) => 'summary' in d && 'type' in d));
});

test('pin: --list is empty when nothing is pinned', async () => {
  const res = await run('pin', { opt: { list: true }, root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
  assert.match(res.lines[0], /no pinned notes/);
});

test('pin: nonexistent ref errors without writing', async () => {
  const res = await run('pin', { pos: ['nope'], root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /no note matches/);
});

test('pin: ambiguous ref errors without writing', async () => {
  const before = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-a.md'), 'utf8');
  const res = await run('pin', { pos: ['a'], root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /ambiguous/);
  const after = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-a.md'), 'utf8');
  assert.equal(before, after);
});

test('pin: round-trip preserves an unknown frontmatter field', async () => {
  seedNote(root, 'testproj', 'memory', '2026-01-04-custom.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'c', tags: ['t1'], created: '2026-01-04', custom_field: 'keep-me' }, 'custom body');
  const res = await run('pin', { pos: ['2026-01-04-custom'], root });
  assert.equal(res.ok, true);
  const txt = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-04-custom.md'), 'utf8');
  assert.match(txt, /^custom_field: keep-me$/m);
  assert.match(txt, /^pinned: true$/m);
  assert.match(txt, /custom body/);
});

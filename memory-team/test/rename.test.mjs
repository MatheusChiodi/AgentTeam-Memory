import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
beforeEach(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-old-title.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 's', created: '2026-01-01' }, '# Old Title\nbody text');
});
afterEach(() => cleanup(root));

test('rename: keeps date prefix, reslugs, rewrites heading', async () => {
  const res = await run('rename', { root, pos: ['old-title', 'Brand New Name'] });
  assert.equal(res.ok, true);
  const dest = join(root, 'projects', 'testproj', 'memory', '2026-01-01-brand-new-name.md');
  assert.ok(existsSync(dest));
  assert.ok(!existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-old-title.md')));
  const txt = readFileSync(dest, 'utf8');
  assert.match(txt, /# Brand New Name/);
  assert.doesNotMatch(txt, /# Old Title/);
  assert.equal(res.data.to, 'projects/testproj/memory/2026-01-01-brand-new-name.md');
});

test('rename: note without date prefix gets a bare slug', async () => {
  seedNote(root, 'testproj', 'agents', 'executor.md',
    { type: 'state', agent: 'executor', project: 'testproj', summary: 's', created: '2026-01-01' }, '# executor');
  const res = await run('rename', { root, pos: ['executor', 'Worker State'] });
  assert.equal(res.ok, true);
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'agents', 'worker-state.md')));
});

test('rename: unknown ref fails', async () => {
  const res = await run('rename', { root, pos: ['ghost', 'whatever'] });
  assert.equal(res.ok, false);
  assert.match(res.lines.join(' '), /no note matches/);
});

test('rename: missing title fails', async () => {
  const res = await run('rename', { root, pos: ['old-title'] });
  assert.equal(res.ok, false);
  assert.match(res.lines.join(' '), /usage: rename/);
});

test('rename: refuses to clobber an existing note with the target name', async () => {
  // A sibling already owns the slug the rename would produce.
  seedNote(root, 'testproj', 'memory', '2026-01-01-taken.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'keep me', created: '2026-01-01' }, '# Taken\nprecious body');
  const res = await run('rename', { root, pos: ['old-title', 'Taken'] });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.lines.join(' '), /already exists/);
  // both notes survive untouched
  const taken = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-taken.md'), 'utf8');
  assert.match(taken, /precious body/);
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-old-title.md')));
});

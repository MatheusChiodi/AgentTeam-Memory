import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
beforeEach(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-keepme.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'one', created: '2026-01-01' }, '# keep');
});
afterEach(() => cleanup(root));

test('archive: moves a note into _archive', async () => {
  const res = await run('archive', { root, pos: ['keepme'] });
  assert.equal(res.ok, true);
  assert.equal(res.data.archived, true);
  assert.ok(!existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-keepme.md')));
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'memory', '_archive', '2026-01-01-keepme.md')));
});

test('archive: --restore moves it back to memory/', async () => {
  await run('archive', { root, pos: ['keepme'] });
  const res = await run('archive', { root, pos: ['keepme'], opt: { restore: true } });
  assert.equal(res.ok, true);
  assert.equal(res.data.archived, false);
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-keepme.md')));
});

test('archive: unknown ref fails', async () => {
  const res = await run('archive', { root, pos: ['ghost'] });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.lines.join(' '), /no .*note matches/);
});

test('archive: ambiguous ref fails', async () => {
  seedNote(root, 'testproj', 'memory', '2026-01-02-keepme-too.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'two', created: '2026-01-02' }, '# k');
  const res = await run('archive', { root, pos: ['keepme'] });
  assert.equal(res.ok, false);
  assert.match(res.lines.join(' '), /ambiguous/);
});

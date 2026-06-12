import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
beforeEach(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t1', 't2'], created: '2026-01-01' }, 'body a [[2026-01-02-b]]');
  seedNote(root, 'testproj', 'memory', '2026-01-02-b.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t1'], created: '2026-01-02' }, 'body b');
  seedNote(root, 'testproj', 'memory', '2026-01-03-amb.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['t1'], created: '2026-01-03' }, 'amb');
});
afterEach(() => cleanup(root));

test('tag: --add appends unique tags and rewrites the file', async () => {
  const res = await run('tag', { pos: ['2026-01-01-a'], opt: { add: 'new,t1' }, root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.tags, ['t1', 't2', 'new']);
  const txt = readFileSync(join(root, res.data.file), 'utf8');
  assert.match(txt, /tags: \[t1, t2, new\]/);
});

test('tag: --remove drops the tag (case-insensitive)', async () => {
  const res = await run('tag', { pos: ['2026-01-01-a'], opt: { remove: 'T2' }, root });
  assert.deepEqual(res.data.tags, ['t1']);
});

test('tag: add + remove in one pass', async () => {
  const res = await run('tag', { pos: ['2026-01-01-a'], opt: { add: 'x', remove: 't1' }, root });
  assert.deepEqual(res.data.tags, ['t2', 'x']);
});

test('tag: rewritten note keeps its body intact', async () => {
  const res = await run('tag', { pos: ['2026-01-01-a'], opt: { add: 'z' }, root });
  const txt = readFileSync(join(root, res.data.file), 'utf8');
  assert.match(txt, /body a \[\[2026-01-02-b\]\]/);
});

test('tag: nonexistent ref errors', async () => {
  const res = await run('tag', { pos: ['nope'], opt: { add: 'z' }, root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /no note matches/);
});

test('tag: ambiguous ref errors', async () => {
  const res = await run('tag', { pos: ['a'], opt: { add: 'z' }, root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /ambiguous/);
});

test('tag: no --add/--remove is a no-op error', async () => {
  const res = await run('tag', { pos: ['2026-01-01-a'], root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /nothing to do/);
});

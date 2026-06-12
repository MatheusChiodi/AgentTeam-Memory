import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
beforeEach(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', '2026-01-01-a.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['old', 'keep'], created: '2026-01-01' }, 'a');
  seedNote(root, 'testproj', 'memory', '2026-01-02-b.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['old'], created: '2026-01-02' }, 'b');
  seedNote(root, 'testproj', 'memory', '2026-01-03-c.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['unrelated'], created: '2026-01-03' }, 'c');
  seedNote(root, 'other', 'memory', '2026-01-04-d.md',
    { type: 'memory', project: 'other', agent: 'x', summary: 's', tags: ['old'], created: '2026-01-04' }, 'd');
});
afterEach(() => cleanup(root));

test('retag: renames the tag only on affected project notes', async () => {
  const res = await run('retag', { pos: ['old', 'fresh'], root });
  assert.equal(res.ok, true);
  assert.equal(res.data.changed, 2);
  const a = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-a.md'), 'utf8');
  assert.match(a, /tags: \[fresh, keep\]/);
  const c = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-03-c.md'), 'utf8');
  assert.match(c, /tags: \[unrelated\]/);
});

test('retag: does not touch other projects without --all', async () => {
  await run('retag', { pos: ['old', 'fresh'], root });
  const d = readFileSync(join(root, 'projects', 'other', 'memory', '2026-01-04-d.md'), 'utf8');
  assert.match(d, /tags: \[old\]/);
});

test('retag: --all spans every project', async () => {
  const res = await run('retag', { pos: ['old', 'fresh'], opt: { all: true }, root });
  assert.equal(res.data.changed, 3);
});

test('retag: merging into an existing tag stays unique', async () => {
  const res = await run('retag', { pos: ['old', 'keep'], root });
  assert.equal(res.data.changed, 2);
  const a = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-a.md'), 'utf8');
  assert.match(a, /tags: \[keep\]/);
});

test('retag: no match reports zero changes', async () => {
  const res = await run('retag', { pos: ['ghost', 'x'], root });
  assert.equal(res.ok, true);
  assert.equal(res.data.changed, 0);
});

test('retag: missing args errors', async () => {
  const res = await run('retag', { pos: ['only-one'], root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /usage: retag/);
});

test('retag: rewriting a note canonicalizes related (no bracket multiplication, repairs triple)', async () => {
  // seedNote serializes related: ["[[a]]"] on disk as the degraded `related: [[[a]]]`.
  seedNote(root, 'testproj', 'memory', '2026-01-05-rel.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 's', tags: ['old'], related: ['[[a]]', '[[b]]'], created: '2026-01-05' }, '# rel\nbody');
  const res = await run('retag', { pos: ['old', 'fresh'], root });
  assert.equal(res.ok, true);
  const txt = readFileSync(join(root, 'projects', 'testproj', 'memory', '2026-01-05-rel.md'), 'utf8');
  // canonical form, exactly two brackets each side, never three
  assert.match(txt, /related: \["\[\[a\]\]", "\[\[b\]\]"\]/);
  assert.doesNotMatch(txt, /\[\[\[/);
  assert.doesNotMatch(txt, /\]\]\]/);
});

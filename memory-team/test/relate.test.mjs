import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

// Vault layout for similarity:
//   source    : tags [graph, cli]   summary "ranking notes by similarity"
//   near-tag  : tags [graph, ui]     summary "unrelated words entirely"   (shares tag)
//   near-sum  : tags [misc]          summary "ranking similarity engine"  (shares summary terms)
//   same-type : tags [zzz]           summary "nothing common at all"      (only same type)
//   disjoint  : tags [zzz] type=other summary "nothing common at all"     (nothing shared)
//   linked    : tags [graph, cli]    already linked from source           (must be excluded)
let root;
before(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', 'source.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'ranking notes by similarity', tags: ['graph', 'cli'], related: ['[[linked]]'], created: '2026-01-01' },
    'body of source');
  seedNote(root, 'testproj', 'memory', 'near-tag.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'unrelated words entirely', tags: ['graph', 'ui'], created: '2026-01-02' }, 'b');
  seedNote(root, 'testproj', 'memory', 'near-sum.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'ranking similarity engine', tags: ['misc'], created: '2026-01-03' }, 'b');
  seedNote(root, 'testproj', 'memory', 'same-type.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'nothing common here friend', tags: ['zzz'], created: '2026-01-04' }, 'b');
  seedNote(root, 'testproj', 'memory', 'disjoint.md',
    { type: 'decision', project: 'testproj', agent: 'x', summary: 'fully orthogonal payload outcome', tags: ['qqq'], created: '2026-01-05' }, 'b');
  seedNote(root, 'testproj', 'memory', 'linked.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'ranking notes by similarity', tags: ['graph', 'cli'], created: '2026-01-06' }, 'b');
});
after(() => cleanup(root));

test('relate: ranks similar notes above unrelated ones', async () => {
  const res = await run('relate', { pos: ['source'], root });
  assert.equal(res.ok, true);
  const names = res.data.map((d) => d.name);
  // near-tag (shared tag, score 3) and near-sum (shared summary terms) rank above same-type (1)
  assert.ok(names.indexOf('near-tag') < names.indexOf('same-type'));
  assert.ok(names.indexOf('near-sum') < names.indexOf('same-type'));
  // disjoint shares nothing → never suggested
  assert.ok(!names.includes('disjoint'));
});

test('relate: excludes the source itself and already-linked notes', async () => {
  const res = await run('relate', { pos: ['source'], root });
  const names = res.data.map((d) => d.name);
  assert.ok(!names.includes('source'));
  assert.ok(!names.includes('linked'));
});

test('relate: --top limits the number of suggestions', async () => {
  const res = await run('relate', { pos: ['source'], opt: { top: '1' }, root });
  assert.equal(res.data.length, 1);
});

test('relate: --json yields {name, score, reason}', async () => {
  const res = await run('relate', { pos: ['source'], opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.every((d) => 'name' in d && 'score' in d && 'reason' in d));
  assert.ok(res.data[0].score > 0);
});

test('relate: --apply writes suggestions into related without duplicating', async () => {
  const res = await run('relate', { pos: ['source'], opt: { apply: true }, root });
  assert.equal(res.ok, true);
  const file = `${root}/projects/testproj/memory/source.md`;
  const raw = readFileSync(file, 'utf8');
  // pre-existing link preserved, new top picks added
  assert.match(raw, /\[\[linked\]\]/);
  assert.match(raw, /\[\[near-tag\]\]/);
  // applying twice must not duplicate any wikilink
  await run('relate', { pos: ['source'], opt: { apply: true }, root });
  const raw2 = readFileSync(file, 'utf8');
  const count = (raw2.match(/\[\[near-tag\]\]/g) || []).length;
  assert.equal(count, 1);
  const linkedCount = (raw2.match(/\[\[linked\]\]/g) || []).length;
  assert.equal(linkedCount, 1);
});

test('relate: --apply preserves an unknown frontmatter field (round-trip)', async () => {
  // seed a note with a custom field that the canonical FM_ORDER does not know about
  seedNote(root, 'testproj', 'memory', 'extra.md',
    { type: 'memory', project: 'testproj', agent: 'x', summary: 'ranking notes by similarity', tags: ['graph', 'cli'], custom: 'keepme', created: '2026-02-01' },
    'body');
  const res = await run('relate', { pos: ['extra'], opt: { apply: true }, root });
  assert.equal(res.ok, true);
  const raw = readFileSync(`${root}/projects/testproj/memory/extra.md`, 'utf8');
  assert.match(raw, /custom: keepme/);
  assert.match(raw, /related: \[/);
});

test('relate: no candidates returns an empty list, exit 0', async () => {
  // a note in an isolated project with nothing to relate to
  seedNote(root, 'solo', 'memory', 'alone.md',
    { type: 'memory', project: 'solo', agent: 'x', summary: 'qwxz vbnm plkj', tags: ['solotag'], created: '2026-03-01' }, 'b');
  const res = await run('relate', { pos: ['alone'], project: 'solo', root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
  assert.match(res.lines.join('\n'), /no related candidates/);
});

test('relate: nonexistent ref errors with exit 1', async () => {
  const res = await run('relate', { pos: ['ghost-note'], root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /no note matches/);
});

test('relate: missing ref shows usage', async () => {
  const res = await run('relate', { pos: [], root });
  assert.equal(res.ok, false);
  assert.match(res.data.error, /usage: relate/);
});

test('relate: ambiguous ref errors with exit 1 listing matches', async () => {
  // two notes whose names both contain the same fragment → ref resolves to >1
  seedNote(root, 'amb', 'memory', 'dup-alpha.md',
    { type: 'memory', project: 'amb', agent: 'x', summary: 's', tags: ['t'], created: '2026-04-01' }, 'b');
  seedNote(root, 'amb', 'memory', 'dup-beta.md',
    { type: 'memory', project: 'amb', agent: 'x', summary: 's', tags: ['t'], created: '2026-04-02' }, 'b');
  const res = await run('relate', { pos: ['dup'], project: 'amb', root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /ambiguous/);
  assert.match(res.data.error, /dup-alpha/);
  assert.match(res.data.error, /dup-beta/);
});

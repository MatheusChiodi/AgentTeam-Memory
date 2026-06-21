import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Layout for a note-centered mindmap:
//   hub      : tags [graph, cli], links [[linked]]   → root
//   linked   : tags [misc]                           → branch via wikilink
//   sib-tag  : tags [graph]                          → branch via shared tag
//   stranger : tags [zzz]                            → no relation, never a branch
// And a tag cluster:
//   carrier-1/carrier-2 carry tag 'shared'.
const PROJ = 'mindmap-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'hub.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['graph', 'cli'], related: ['[[linked]]'], created: '2026-01-01' }, 'corpo do hub');
  seedNote(root, PROJ, 'memory', 'linked.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['misc'], created: '2026-01-02' }, 'b');
  seedNote(root, PROJ, 'memory', 'sib-tag.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['graph'], created: '2026-01-03' }, 'b');
  seedNote(root, PROJ, 'memory', 'stranger.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['zzz'], created: '2026-01-04' }, 'b');
  seedNote(root, PROJ, 'memory', 'carrier-1.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['shared'], created: '2026-01-05' }, 'b');
  seedNote(root, PROJ, 'memory', 'carrier-2.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['shared'], created: '2026-01-06' }, 'b');
});
after(() => cleanup(root));

test('mindmap: <ref> root has wikilink + shared-tag branches, excludes strangers', async () => {
  const res = await run('mindmap', { pos: ['hub'], project: PROJ, root });
  assert.equal(res.ok, true);
  assert.equal(res.data.root, 'hub');
  assert.ok(res.data.branches.includes('linked')); // via [[wikilink]]
  assert.ok(res.data.branches.includes('sib-tag')); // via shared tag 'graph'
  assert.ok(!res.data.branches.includes('stranger')); // nothing shared
  assert.ok(!res.data.branches.includes('hub')); // root excluded from its own branches
  // emits a valid fenced mermaid mindmap block
  const text = res.lines.join('\n');
  assert.match(text, /```mermaid/);
  assert.match(text, /mindmap/);
});

test('mindmap: --tag root with carrier notes as branches', async () => {
  const res = await run('mindmap', { project: PROJ, opt: { tag: 'shared' }, root });
  assert.equal(res.ok, true);
  assert.equal(res.data.root, '#shared');
  assert.deepEqual([...res.data.branches].sort(), ['carrier-1', 'carrier-2']);
  assert.match(res.lines.join('\n'), /```mermaid/);
});

test('mindmap: hostile tag label does not leak ] " | into the block', async () => {
  // tags come from --opt (not the filesystem), so we can feed a parser-hostile one.
  const res = await run('mindmap', { project: PROJ, opt: { tag: 'a]b"c|d' }, root });
  assert.equal(res.ok, true);
  const text = res.lines.join('\n');
  assert.match(text, /```mermaid/);
  // the raw dangerous characters must be neutralized by mermaidEscape
  assert.ok(!text.includes(']'));
  assert.ok(!text.includes('"'));
  assert.ok(!text.includes('|'));
});

test('mindmap: --tag with no notes → mindmap with just the root, exit 0', async () => {
  const res = await run('mindmap', { project: PROJ, opt: { tag: 'nonexistent-tag' }, root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.branches, []);
  assert.equal(res.data.root, '#nonexistent-tag');
  assert.match(res.lines.join('\n'), /mindmap/);
});

test('mindmap: a root that escapes to empty falls back to a valid placeholder', async () => {
  // '#|||' → mermaidEscape strips everything → would render `root(())`; placeholder keeps it valid.
  const res = await run('mindmap', { project: PROJ, opt: { tag: '|||' }, root });
  assert.equal(res.ok, true);
  const text = res.lines.join('\n');
  assert.match(text, /root\(\(root\)\)/);
  assert.ok(!text.includes('(())'));
});

test('mindmap: --json returns {root, branches}', async () => {
  const res = await run('mindmap', { pos: ['hub'], project: PROJ, opt: { json: true }, root });
  assert.ok('root' in res.data && Array.isArray(res.data.branches));
});

test('mindmap: nonexistent <ref> → error, exit 1', async () => {
  const res = await run('mindmap', { pos: ['ghost-note'], project: PROJ, root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /no note matches/);
});

test('mindmap: neither ref nor --tag → usage error, exit 1', async () => {
  const res = await run('mindmap', { project: PROJ, root });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /usage: mindmap/);
});

test('mindmap: --save persists a note tagged mindmap (deterministic via opt.today)', async () => {
  const res = await run('mindmap', { pos: ['hub'], project: PROJ, opt: { save: true, today: '2026-06-21' }, root });
  assert.equal(res.ok, true);
  assert.ok(res.data.file);
  assert.match(res.data.file, /2026-06-21/);
  const raw = readFileSync(`${root}/${res.data.file}`, 'utf8');
  assert.match(raw, /tags: \[mindmap\]/);
  assert.match(raw, /```mermaid/);
});

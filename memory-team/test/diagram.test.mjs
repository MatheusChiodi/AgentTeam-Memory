process.env.NO_COLOR = '1'; // assert on rendered Mermaid text, not ANSI
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

// links scope: a→b real edge; a→ghost dangling (must NOT appear); c isolated.
// also a note whose title has Mermaid-hostile chars to prove sanitization.
let root;
const P = 'diagproj';
before(() => {
  root = makeVault();
  seedNote(root, P, 'memory', 'a.md',
    { type: 'memory', project: P, agent: 'x', summary: 'note a', tags: ['t'], related: ['[[b]]', '[[ghost]]'], created: '2026-01-01' }, 'links [[b]] and [[ghost]]');
  seedNote(root, P, 'memory', 'b.md',
    { type: 'decision', project: P, agent: 'y', summary: 'note b', tags: ['t', 'u'], created: '2026-01-02' }, 'b body');
  seedNote(root, P, 'memory', 'c.md',
    { type: 'memory', project: P, agent: 'x', summary: 'isolated', tags: ['z'], created: '2026-01-03' }, 'no links');
});
after(() => cleanup(root));

test('diagram: links scope emits a mermaid flowchart with a resolved edge', async () => {
  const res = await run('diagram', { root, project: P });
  assert.equal(res.ok, true);
  const text = res.lines.join('\n');
  assert.match(text, /```mermaid/);
  assert.match(text, /flowchart LR/);
  // a → b is a real edge; both nodes present
  assert.equal(res.data.scope, 'links');
  assert.ok(res.data.edges.some((e) => e.from === 'a' && e.to === 'b'));
});

test('diagram: no phantom edge to a non-existent target', async () => {
  const res = await run('diagram', { root, project: P });
  // ghost is referenced by a but does not exist → never a node, never an edge
  assert.ok(!res.data.nodes.includes('ghost'));
  assert.ok(!res.data.edges.some((e) => e.to === 'ghost'));
});

test('diagram: tags scope is bipartite note↔tag', async () => {
  const res = await run('diagram', { root, project: P, opt: { scope: 'tags' } });
  assert.equal(res.data.scope, 'tags');
  // a, b carry tag t → both edges present
  assert.ok(res.data.edges.some((e) => e.note === 'a' && e.key === 't'));
  assert.ok(res.data.edges.some((e) => e.note === 'b' && e.key === 'u'));
  assert.match(res.lines.join('\n'), /flowchart LR/);
});

test('diagram: sanitizes hostile labels — no ] " | leaks into the block', async () => {
  // Windows rejects ] " | in filenames, so we carry the hostile chars in a TAG value (lives
  // in frontmatter, not the path). The tags scope renders the tag as a node label via
  // mermaidEscape — the same sanitizer the links scope uses for note names — so this proves
  // the whole class is neutralized regardless of where the label comes from.
  const hostile = makeVault();
  seedNote(hostile, 'hp', 'memory', 'note.md',
    { type: 'memory', project: 'hp', agent: 'x', summary: 's', tags: ['a]b"c|d'], created: '2026-02-01' }, 'body');
  const res = await run('diagram', { root: hostile, project: 'hp', opt: { scope: 'tags' } });
  const block = res.lines.join('\n');
  assert.match(block, /```mermaid/);
  // the raw hostile tag survives into data (unsanitized — sanitization is render-only)
  assert.ok(res.data.edges.some((e) => e.key === 'a]b"c|d'));
  // Inspect only the label payloads (text inside ["..."]); none may contain ] " | which
  // would break the parser. mermaidEscape turns each into a space.
  const labels = [...block.matchAll(/\["([^\n]*?)"\]/g)].map((m) => m[1]);
  assert.ok(labels.length > 0);
  for (const label of labels) {
    assert.ok(!label.includes(']'), `bracket leaked: ${label}`);
    assert.ok(!label.includes('"'), `quote leaked: ${label}`);
    assert.ok(!label.includes('|'), `pipe leaked: ${label}`);
  }
  // the sanitized hostile label is present: ] | → space, " → ' (mermaidEscape) → "a b'c d"
  assert.ok(labels.some((l) => l === "a b'c d"));
  cleanup(hostile);
});

test('diagram: empty vault yields a valid mermaid block with a placeholder, exit 0', async () => {
  const empty = makeVault();
  const res = await run('diagram', { root: empty, project: 'nothing' });
  assert.equal(res.ok, true);
  const text = res.lines.join('\n');
  assert.match(text, /```mermaid/);
  assert.match(text, /flowchart LR/);
  assert.equal(res.data.nodes.length, 0);
  assert.equal(res.data.edges.length, 0);
  // a placeholder node line exists so the block is parseable
  assert.match(text, /\["/);
  cleanup(empty);
});

test('diagram: --json data has scope, nodes, edges as arrays', async () => {
  const res = await run('diagram', { root, project: P, opt: { json: true } });
  assert.ok(Array.isArray(res.data.nodes));
  assert.ok(Array.isArray(res.data.edges));
  assert.equal(typeof res.data.scope, 'string');
});

test('diagram: --save persists a memory note tagged diagram', async () => {
  const sv = makeVault();
  seedNote(sv, 'sp', 'memory', 'a.md',
    { type: 'memory', project: 'sp', agent: 'x', summary: 's', tags: ['t'], related: ['[[b]]'], created: '2026-03-01' }, 'b');
  seedNote(sv, 'sp', 'memory', 'b.md',
    { type: 'memory', project: 'sp', agent: 'x', summary: 's', tags: ['t'], created: '2026-03-02' }, 'b');
  const res = await run('diagram', { root: sv, project: 'sp', opt: { save: true, today: '2026-03-10' } });
  assert.equal(res.ok, true);
  assert.match(res.data.file, /diagram/);
  assert.match(res.lines.join('\n'), /saved diagram/);
  cleanup(sv);
});

test('diagram: unknown scope errors with exit 1', async () => {
  const res = await run('diagram', { root, project: P, opt: { scope: 'bogus' } });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /unknown scope/);
});

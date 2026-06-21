import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Layout: the term "ranking" appears in 3 notes' summaries, "engine" in 2, "solo" in 1.
const PROJ = 'glossary-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'alpha.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'ranking engine design', tags: ['t'], created: '2026-01-01' }, 'b');
  seedNote(root, PROJ, 'memory', 'beta.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'ranking engine tuning', tags: ['t'], created: '2026-01-02' }, 'b');
  seedNote(root, PROJ, 'memory', 'gamma.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'ranking heuristics only', tags: ['t'], created: '2026-01-03' }, 'b');
  seedNote(root, PROJ, 'memory', 'delta.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'solo unique payload', tags: ['t'], created: '2026-01-04' }, 'b');
});
after(() => cleanup(root));

test('glossary: keeps terms with freq >= min (default 2), drops singletons', async () => {
  const res = await run('glossary', { project: PROJ, root });
  assert.equal(res.ok, true);
  const terms = res.data.map((d) => d.term);
  assert.ok(terms.includes('ranking'));
  assert.ok(terms.includes('engine'));
  // a term appearing in only one note is excluded at the default min of 2
  assert.ok(!terms.includes('solo'));
});

test('glossary: sorts by count desc and lists source notes', async () => {
  const res = await run('glossary', { project: PROJ, root });
  assert.equal(res.data[0].term, 'ranking');
  assert.equal(res.data[0].count, 3);
  assert.deepEqual([...res.data[0].notes].sort(), ['alpha', 'beta', 'gamma']);
});

test('glossary: --min raises the threshold', async () => {
  const res = await run('glossary', { project: PROJ, opt: { min: '3' }, root });
  const terms = res.data.map((d) => d.term);
  assert.ok(terms.includes('ranking')); // 3 notes
  assert.ok(!terms.includes('engine')); // only 2 notes
});

test('glossary: --top caps the notes-source list per term', async () => {
  const res = await run('glossary', { project: PROJ, opt: { top: '2' }, root });
  const ranking = res.data.find((d) => d.term === 'ranking');
  assert.equal(ranking.count, 3); // count is the full frequency
  assert.equal(ranking.notes.length, 2); // but the source list is capped
});

test('glossary: --json returns [{term, count, notes}]', async () => {
  const res = await run('glossary', { project: PROJ, opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.every((d) => 'term' in d && 'count' in d && Array.isArray(d.notes)));
});

test('glossary: empty vault → empty glossary, exit 0', async () => {
  const res = await run('glossary', { project: 'glossary-empty', root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
  assert.match(res.lines.join('\n'), /glossário vazio/);
});

test('glossary: a term counts once per note even if repeated in the summary', async () => {
  seedNote(root, 'glossary-dup', 'memory', 'one.md',
    { type: 'memory', project: 'glossary-dup', agent: 'x', summary: 'cache cache cache layer', tags: ['t'], created: '2026-05-01' }, 'b');
  seedNote(root, 'glossary-dup', 'memory', 'two.md',
    { type: 'memory', project: 'glossary-dup', agent: 'x', summary: 'cache invalidation', tags: ['t'], created: '2026-05-02' }, 'b');
  const res = await run('glossary', { project: 'glossary-dup', root });
  const cache = res.data.find((d) => d.term === 'cache');
  // appears in 2 notes → count 2 (NOT 4 from the triple repeat in note one)
  assert.equal(cache.count, 2);
});

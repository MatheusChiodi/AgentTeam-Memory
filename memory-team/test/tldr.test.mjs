import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

const PROJ = 'tldr-proj';
let root;
const BODY = [
  'The budget engine ranks notes by relevance.',
  'It then fills a token budget greedily.',
  'Notes that do not fit are dropped whole.',
  'This keeps the pack under the budget.',
  'The agent gets a distilled context.',
].join(' ');
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'rich.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'fallback summary line', tags: ['budget'], created: '2026-01-01' }, BODY);
  seedNote(root, PROJ, 'memory', 'nobody.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'this is the only content', tags: ['t'], created: '2026-01-02' }, '');
});
after(() => cleanup(root));

test('tldr <ref>: extracts top-N sentences from the body', async () => {
  const res = await run('tldr', { pos: ['rich'], opt: { sentences: '2' }, root, project: PROJ });
  assert.equal(res.ok, true);
  assert.equal(res.data.name, 'rich');
  assert.ok(res.data.sentences.length <= 2 && res.data.sentences.length >= 1);
  assert.ok(res.data.summary.length > 0);
});

test('tldr <ref>: deterministic — same input, same output', async () => {
  const a = await run('tldr', { pos: ['rich'], root, project: PROJ });
  const b = await run('tldr', { pos: ['rich'], root, project: PROJ });
  assert.equal(a.data.summary, b.data.summary);
});

test('tldr <ref>: no body falls back to frontmatter summary', async () => {
  const res = await run('tldr', { pos: ['nobody'], root, project: PROJ });
  assert.equal(res.data.summary, 'this is the only content');
});

test('tldr (set mode): one line per note with first extracted sentence', async () => {
  const res = await run('tldr', { root, project: PROJ });
  assert.equal(res.ok, true);
  assert.ok(Array.isArray(res.data));
  assert.equal(res.data.length, 2);
  assert.ok(res.data.every((d) => 'name' in d && 'summary' in d));
});

test('tldr --json single: { name, summary, sentences }', async () => {
  const res = await run('tldr', { pos: ['rich'], opt: { json: true }, root, project: PROJ });
  assert.ok('name' in res.data && 'summary' in res.data && Array.isArray(res.data.sentences));
});

test('tldr <ref>: nonexistent ref errors with exit 1', async () => {
  const res = await run('tldr', { pos: ['ghost'], root, project: PROJ });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.data.error, /no note matches/);
});

test('tldr (set mode): empty vault yields empty list, exit 0', async () => {
  const res = await run('tldr', { root, project: 'tldr-empty-proj' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
});

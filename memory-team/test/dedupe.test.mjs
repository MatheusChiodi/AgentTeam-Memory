import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => { root = makeVault(); });
after(() => cleanup(root));

test('dedupe: groups notes sharing a title slug across dates', async () => {
  const r = makeVault();
  try {
    seedNote(r, 'testproj', 'memory', '2026-01-01-deploy-notes.md',
      { type: 'memory', agent: 'a', project: 'testproj', summary: 'one', created: '2026-01-01' }, '# x');
    seedNote(r, 'testproj', 'memory', '2026-02-01-deploy-notes.md',
      { type: 'memory', agent: 'b', project: 'testproj', summary: 'two', created: '2026-02-01' }, '# y');
    const res = await run('dedupe', { root: r });
    assert.equal(res.ok, true);
    const slugGroup = res.data.find((g) => g.key === 'slug:deploy-notes');
    assert.ok(slugGroup);
    assert.equal(slugGroup.notes.length, 2);
  } finally {
    cleanup(r);
  }
});

test('dedupe: groups notes with identical summary', async () => {
  const r = makeVault();
  try {
    seedNote(r, 'testproj', 'memory', '2026-01-01-aaa.md',
      { type: 'memory', agent: 'a', project: 'testproj', summary: 'Same Thing', created: '2026-01-01' }, '# a');
    seedNote(r, 'testproj', 'memory', '2026-01-01-bbb.md',
      { type: 'memory', agent: 'a', project: 'testproj', summary: 'same thing', created: '2026-01-01' }, '# b');
    const res = await run('dedupe', { root: r });
    const sumGroup = res.data.find((g) => g.key.startsWith('summary:'));
    assert.ok(sumGroup);
    assert.equal(sumGroup.notes.length, 2);
  } finally {
    cleanup(r);
  }
});

test('dedupe: no duplicates reports cleanly', async () => {
  seedNote(root, 'testproj', 'memory', '2026-01-01-unique.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'only', created: '2026-01-01' }, '# u');
  const res = await run('dedupe', { root });
  assert.equal(res.ok, true);
  assert.equal(res.data.length, 0);
  assert.match(res.lines.join('\n'), /no suspected duplicates/);
});

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
before(() => {
  root = makeVault();
  for (let i = 1; i <= 12; i++) {
    const day = String(i).padStart(2, '0');
    seedNote(root, 'testproj', 'memory', `2026-01-${day}-n${i}.md`,
      { type: 'memory', project: 'testproj', agent: 'x', summary: `s${i}`, tags: ['t'], created: `2026-01-${day}` }, `body ${i}`);
  }
});
after(() => cleanup(root));

test('recent: defaults to 10 newest-first', async () => {
  const res = await run('recent', { root });
  assert.equal(res.ok, true);
  assert.equal(res.data.length, 10);
  assert.equal(res.data[0].name, '2026-01-12-n12');
  assert.equal(res.data[9].name, '2026-01-03-n3');
});

test('recent: honors explicit n', async () => {
  const res = await run('recent', { pos: ['3'], root });
  assert.equal(res.data.length, 3);
  assert.equal(res.data[0].name, '2026-01-12-n12');
});

test('recent: non-numeric n falls back to default', async () => {
  const res = await run('recent', { pos: ['abc'], root });
  assert.equal(res.data.length, 10);
});

test('recent: empty vault is graceful', async () => {
  const empty = makeVault();
  try {
    const res = await run('recent', { root: empty });
    assert.equal(res.ok, true);
    assert.equal(res.data.length, 0);
    assert.match(res.lines.join('\n'), /no notes yet/);
  } finally {
    cleanup(empty);
  }
});

test('recent: --json keeps data populated', async () => {
  const res = await run('recent', { pos: ['2'], opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.equal(res.data.length, 2);
});

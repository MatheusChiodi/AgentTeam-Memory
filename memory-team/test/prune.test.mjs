import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
beforeEach(() => {
  root = makeVault();
  // prunable: placeholder body
  seedNote(root, 'testproj', 'memory', '2026-01-01-empty.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 's', created: '2026-01-01' },
    '# empty\n(objective content — use [[wikilinks]] to connect and Mermaid when helpful)');
  // prunable: only a heading
  seedNote(root, 'testproj', 'memory', '2026-01-02-heading.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 's', created: '2026-01-02' }, '# just a heading');
  // keep: real content
  seedNote(root, 'testproj', 'memory', '2026-01-03-real.md',
    { type: 'memory', agent: 'a', project: 'testproj', summary: 's', created: '2026-01-03' }, '# real\nactual content here');
});
afterEach(() => cleanup(root));

test('prune: dry-run lists candidates without moving', async () => {
  const res = await run('prune', { root });
  assert.equal(res.ok, true);
  assert.equal(res.data.applied, false);
  assert.equal(res.data.movedCount, 0);
  assert.equal(res.data.candidates.length, 2);
  // files untouched
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-empty.md')));
});

test('prune: --apply archives candidates', async () => {
  const res = await run('prune', { root, opt: { apply: true } });
  assert.equal(res.data.applied, true);
  assert.equal(res.data.movedCount, 2);
  assert.ok(!existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-01-empty.md')));
  assert.ok(existsSync(join(root, 'projects', 'testproj', '_archive', '2026-01-01-empty.md')));
  // the real note stays
  assert.ok(existsSync(join(root, 'projects', 'testproj', 'memory', '2026-01-03-real.md')));
});

test('prune: nothing prunable reports cleanly', async () => {
  const r = makeVault();
  try {
    seedNote(r, 'testproj', 'memory', '2026-01-03-real.md',
      { type: 'memory', agent: 'a', project: 'testproj', summary: 's', created: '2026-01-03' }, '# real\ncontent');
    const res = await run('prune', { root: r });
    assert.equal(res.data.candidates.length, 0);
    assert.match(res.lines.join('\n'), /nothing to prune/);
  } finally {
    cleanup(r);
  }
});

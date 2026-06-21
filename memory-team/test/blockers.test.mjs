import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Vault layout:
//   by-tag      : tags [blocker]                  → source 'tag'
//   by-risk     : tags [risk]                     → source 'tag'
//   by-blocked  : tags [blocked]                  → source 'tag'
//   by-body     : tags [misc], body with "risco" marker → source 'body'
//   by-warn     : tags [misc], body with "⚠" marker     → source 'body'
//   clean       : tags [misc], body with no marker      → not selected
// NOTE: "risco"/"⚠" stay verbatim in seed bodies — they are the risk *markers*
// the command scans for, not UI copy.
const PROJ = 'blockers-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'by-tag.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['blocker'], created: '2026-01-01' }, 'body');
  seedNote(root, PROJ, 'memory', 'by-risk.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['risk'], created: '2026-01-02' }, 'body');
  seedNote(root, PROJ, 'memory', 'by-blocked.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['blocked'], created: '2026-01-03' }, 'body');
  seedNote(root, PROJ, 'memory', 'by-body.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['misc'], created: '2026-01-04' }, 'line 1\nthis is a serious risco\nend');
  seedNote(root, PROJ, 'memory', 'by-warn.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['misc'], created: '2026-01-05' }, '⚠ total alert');
  seedNote(root, PROJ, 'memory', 'clean.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['misc'], created: '2026-01-06' }, 'all clear here');
});
after(() => cleanup(root));

test('blockers: selects notes by risk tag and by body marker', async () => {
  const res = await run('blockers', { project: PROJ, root });
  assert.equal(res.ok, true);
  const names = res.data.map((d) => d.name);
  assert.ok(names.includes('by-tag'));
  assert.ok(names.includes('by-risk'));
  assert.ok(names.includes('by-blocked'));
  assert.ok(names.includes('by-body'));
  assert.ok(names.includes('by-warn'));
  // a clean note is never flagged
  assert.ok(!names.includes('clean'));
});

test('blockers: marks the source as tag vs body', async () => {
  const res = await run('blockers', { project: PROJ, root });
  const byName = Object.fromEntries(res.data.map((d) => [d.name, d]));
  assert.equal(byName['by-tag'].source, 'tag');
  assert.equal(byName['by-warn'].source, 'body');
  // reason carries the offending tag / marker+line
  assert.match(byName['by-tag'].reason, /blocker/);
  assert.match(byName['by-body'].reason, /risco/);
  assert.match(byName['by-body'].reason, /line/);
});

test('blockers: tag wins over body (no double-report)', async () => {
  // a note with BOTH a risk tag and a body marker appears exactly once, as source 'tag'.
  seedNote(root, PROJ, 'memory', 'both.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 's', tags: ['blocker'], created: '2026-02-01' }, 'also has a risco in the body');
  const res = await run('blockers', { project: PROJ, root });
  const hits = res.data.filter((d) => d.name === 'both');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].source, 'tag');
});

test('blockers: --json returns [{name, reason, source}]', async () => {
  const res = await run('blockers', { project: PROJ, opt: { json: true }, root });
  assert.ok(Array.isArray(res.data));
  assert.ok(res.data.every((d) => 'name' in d && 'reason' in d && 'source' in d));
});

test('blockers: no blockers → "no blockers", exit 0', async () => {
  seedNote(root, 'blk-empty', 'memory', 'fine.md',
    { type: 'memory', project: 'blk-empty', agent: 'x', summary: 's', tags: ['ok'], created: '2026-03-01' }, 'all clear');
  const res = await run('blockers', { project: 'blk-empty', root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data, []);
  assert.match(res.lines.join('\n'), /no blockers/);
});

test('blockers: case-insensitive tag and marker matching', async () => {
  seedNote(root, 'blk-case', 'memory', 'upper.md',
    { type: 'memory', project: 'blk-case', agent: 'x', summary: 's', tags: ['BLOCKER'], created: '2026-04-01' }, 'b');
  seedNote(root, 'blk-case', 'memory', 'mixed-body.md',
    { type: 'memory', project: 'blk-case', agent: 'x', summary: 's', tags: ['misc'], created: '2026-04-02' }, 'there is a BLOCKED here');
  const res = await run('blockers', { project: 'blk-case', root });
  const names = res.data.map((d) => d.name);
  assert.ok(names.includes('upper'));
  assert.ok(names.includes('mixed-body'));
});

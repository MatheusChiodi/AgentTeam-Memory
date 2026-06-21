import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

// Layout: 2 decisions + 1 learning across 3 dates, plus a memory note that must be ignored.
const PROJ = 'changelog-proj';
let root;
before(() => {
  root = makeVault();
  seedNote(root, PROJ, 'memory', 'dec-old.md',
    { type: 'decision', project: PROJ, agent: 'x', summary: 'escolhe sqlite', tags: ['t'], created: '2026-01-01' }, 'b');
  seedNote(root, PROJ, 'memory', 'learn-mid.md',
    { type: 'learning', project: PROJ, agent: 'x', summary: 'cache acelera', tags: ['t'], created: '2026-02-01' }, 'b');
  seedNote(root, PROJ, 'memory', 'dec-new.md',
    { type: 'decision', project: PROJ, agent: 'x', summary: 'adota esm', tags: ['t'], created: '2026-03-01' }, 'b');
  seedNote(root, PROJ, 'memory', 'plain.md',
    { type: 'memory', project: PROJ, agent: 'x', summary: 'ruído', tags: ['t'], created: '2026-03-15' }, 'b');
});
after(() => cleanup(root));

test('changelog: collects decisions+learnings, newest first, badged by type', async () => {
  const res = await run('changelog', { project: PROJ, root });
  assert.equal(res.ok, true);
  const dates = res.data.entries.map((e) => e.date);
  assert.deepEqual(dates, ['2026-03-01', '2026-02-01', '2026-01-01']);
  // a plain memory note is never included
  assert.ok(!res.data.entries.some((e) => e.title === 'plain'));
  const text = res.lines.join('\n');
  assert.match(text, /\[decisão\]/);
  assert.match(text, /\[aprendizado\]/);
});

test('changelog: --since filters by created>=since', async () => {
  const res = await run('changelog', { project: PROJ, opt: { since: '2026-02-01' }, root });
  const dates = res.data.entries.map((e) => e.date);
  assert.deepEqual(dates, ['2026-03-01', '2026-02-01']);
  assert.equal(res.data.since, '2026-02-01');
});

test('changelog: --json returns {since, entries:[{date,type,title,summary}]}', async () => {
  const res = await run('changelog', { project: PROJ, opt: { json: true }, root });
  assert.ok('since' in res.data && Array.isArray(res.data.entries));
  assert.ok(res.data.entries.every((e) => 'date' in e && 'type' in e && 'title' in e && 'summary' in e));
});

test('changelog: empty window → empty changelog, exit 0', async () => {
  const res = await run('changelog', { project: 'changelog-empty', root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.entries, []);
  assert.match(res.lines.join('\n'), /nada na janela/);
});

test('changelog: --since beyond all notes → empty, exit 0', async () => {
  const res = await run('changelog', { project: PROJ, opt: { since: '2030-01-01' }, root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.entries, []);
});

test('changelog: --save persists a deterministic note with tag changelog (opt.today)', async () => {
  const res = await run('changelog', { project: PROJ, opt: { save: true, today: '2026-06-21' }, root });
  assert.equal(res.ok, true);
  assert.ok(res.data.file);
  // determinism: the saved filename embeds the injected date, not the real clock
  assert.match(res.data.file, /2026-06-21/);
  const raw = readFileSync(`${root}/${res.data.file}`, 'utf8');
  assert.match(raw, /tags: \[changelog\]/);
  assert.match(raw, /created: 2026-06-21/);
  assert.match(raw, /\[decisão\]/);
});

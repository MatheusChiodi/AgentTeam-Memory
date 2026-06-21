import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

process.env.NO_COLOR = '1';

let root;
before(() => {
  root = makeVault();
  seedNote(root, 'hand', 'agents', 'executor.md',
    { type: 'state', project: 'hand', agent: 'executor', summary: 'building cluster', tags: [], created: '2026-06-10' },
    '## State\n- [ ] finish handoff\n- [x] finish plan');
  seedNote(root, 'hand', 'agents', 'researcher.md',
    { type: 'state', project: 'hand', agent: 'researcher', summary: 'reading docs', tags: [], created: '2026-06-11' }, 'b');
  seedNote(root, 'hand', 'memory', 'pinned.md',
    { type: 'memory', project: 'hand', agent: 'x', summary: 'key fact', tags: ['x'], pinned: 'true', created: '2026-06-09' },
    '- [ ] open item in pinned');
  seedNote(root, 'hand', 'memory', 'a-decision.md',
    { type: 'decision', project: 'hand', agent: 'x', summary: 'use ESM', tags: ['arch'], created: '2026-06-08' }, 'b');
});
after(() => cleanup(root));

test('handoff: assembles states, open items, pins, decisions', async () => {
  const res = await run('handoff', { project: 'hand', root });
  assert.equal(res.ok, true);
  assert.equal(res.data.states.length, 2);
  // open checkboxes: 'finish handoff' + 'open item in pinned' (NOT 'finish plan' which is done)
  const texts = res.data.open.map((o) => o.text);
  assert.ok(texts.includes('finish handoff'));
  assert.ok(texts.includes('open item in pinned'));
  assert.ok(!texts.includes('finish plan'));
  assert.equal(res.data.pins.length, 1);
  assert.equal(res.data.pins[0].name, 'pinned');
  assert.equal(res.data.decisions.length, 1);
  assert.equal(res.data.decisions[0].name, 'a-decision');
});

test('handoff: emits cohesive markdown with all sections', async () => {
  const res = await run('handoff', { project: 'hand', root });
  const md = res.lines.join('\n');
  assert.match(md, /## State per agent/);
  assert.match(md, /## Open items/);
  assert.match(md, /## Pins/);
  assert.match(md, /## Recent decisions/);
});

test('handoff: --save persists a memory note tagged handoff with related wikilinks', async () => {
  const res = await run('handoff', { opt: { save: true }, project: 'hand', root });
  assert.ok(res.data.path);
  const raw = readFileSync(`${root}/${res.data.path}`, 'utf8');
  assert.match(raw, /tags: \[handoff\]/);
  // related must wikilink back to a source (e.g. the decision or a state)
  assert.match(raw, /related: \[/);
  assert.match(raw, /\[\[a-decision\]\]|\[\[executor\]\]|\[\[pinned\]\]/);
});

test('handoff: --json returns { states, open, pins, decisions }', async () => {
  const res = await run('handoff', { opt: { json: true }, project: 'hand', root });
  assert.ok('states' in res.data && 'open' in res.data && 'pins' in res.data && 'decisions' in res.data);
});

test('handoff: empty vault yields a minimal valid packet, exit 0', async () => {
  const res = await run('handoff', { project: 'emptyhand', root });
  assert.equal(res.ok, true);
  assert.deepEqual(res.data.states, []);
  assert.deepEqual(res.data.open, []);
  assert.deepEqual(res.data.pins, []);
  assert.deepEqual(res.data.decisions, []);
  const md = res.lines.join('\n');
  assert.match(md, /no state recorded/);
  assert.match(md, /no open items/);
});

test('handoff: latest state per agent wins (most recent created)', async () => {
  // add a newer executor state in a different project to confirm dedup-by-agent keeps newest
  seedNote(root, 'hand2', 'agents', 'executor.md',
    { type: 'state', project: 'hand2', agent: 'solo', summary: 'old summary', tags: [], created: '2026-01-01' }, 'b');
  seedNote(root, 'hand2', 'memory', 'newer-state.md',
    { type: 'state', project: 'hand2', agent: 'solo', summary: 'newer summary', tags: [], created: '2026-06-20' }, 'b');
  const res = await run('handoff', { project: 'hand2', root });
  const solo = res.data.states.find((s) => s.agent === 'solo');
  assert.match(solo.summary, /newer summary/);
});

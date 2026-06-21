import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { makeVault, cleanup, run, seedNote } from './_helpers.mjs';

let root;
const noteAt = (...p) => join(root, 'projects', 'testproj', ...p);

beforeEach(() => {
  root = makeVault();
  seedNote(root, 'testproj', 'memory', 'a.md',
    { type: 'memory', agent: 'x', project: 'testproj', summary: 'one', created: '2026-01-01' }, '# A');
  seedNote(root, 'testproj', 'memory', 'b.md',
    { type: 'memory', agent: 'x', project: 'testproj', summary: 'two', created: '2026-01-02' }, '# B');
});
afterEach(() => cleanup(root));

test('snapshot: copies every note into _snapshots/<id>', async () => {
  const res = await run('snapshot', { root, opt: { id: 'snap1' } });
  assert.equal(res.ok, true);
  assert.equal(res.data.id, 'snap1');
  assert.equal(res.data.count, 2);
  assert.ok(existsSync(join(root, '_snapshots', 'snap1', 'projects', 'testproj', 'memory', 'a.md')));
  assert.ok(existsSync(join(root, '_snapshots', 'snap1', 'projects', 'testproj', 'memory', 'b.md')));
});

test('snapshot: --list shows existing snapshots with counts', async () => {
  await run('snapshot', { root, opt: { id: 'snap1' } });
  const res = await run('snapshot', { root, opt: { list: true } });
  assert.equal(res.ok, true);
  assert.equal(res.data.length, 1);
  assert.equal(res.data[0].id, 'snap1');
  assert.equal(res.data[0].count, 2);
});

test('snapshot: --restore repõe uma nota alterada', async () => {
  await run('snapshot', { root, opt: { id: 'snap1' } });
  writeFileSync(noteAt('memory', 'a.md'), 'CORRUPTED', 'utf8');
  const res = await run('snapshot', { root, opt: { restore: 'snap1' } });
  assert.equal(res.ok, true);
  assert.equal(readFileSync(noteAt('memory', 'a.md'), 'utf8').includes('# A'), true);
});

test('snapshot: --restore repõe uma nota removida', async () => {
  await run('snapshot', { root, opt: { id: 'snap1' } });
  rmSync(noteAt('memory', 'b.md'));
  assert.equal(existsSync(noteAt('memory', 'b.md')), false);
  await run('snapshot', { root, opt: { restore: 'snap1' } });
  assert.equal(existsSync(noteAt('memory', 'b.md')), true);
});

test('snapshot: --restore é reset (limpar-e-repor), não merge — desfaz adições (B1)', async () => {
  await run('snapshot', { root, opt: { id: 'snap1' } });
  // Simula um import em massa que deu errado: notas-lixo criadas APÓS o checkpoint.
  seedNote(root, 'testproj', 'memory', 'junk1.md',
    { type: 'memory', agent: 'x', project: 'testproj', summary: 'j', created: '2026-02-01' }, '# J1');
  seedNote(root, 'testproj', 'memory', 'junk2.md',
    { type: 'memory', agent: 'x', project: 'testproj', summary: 'j', created: '2026-02-01' }, '# J2');
  const res = await run('snapshot', { root, opt: { restore: 'snap1' } });
  assert.equal(res.ok, true);
  // As notas-lixo NÃO podem sobreviver ao restore (esse é o ramo que o merge quebrava).
  assert.equal(existsSync(noteAt('memory', 'junk1.md')), false);
  assert.equal(existsSync(noteAt('memory', 'junk2.md')), false);
  // As notas do checkpoint continuam lá.
  assert.equal(existsSync(noteAt('memory', 'a.md')), true);
  assert.equal(existsSync(noteAt('memory', 'b.md')), true);
  assert.equal(res.data.count, 2);
  assert.equal(res.data.before, 4);
});

test('snapshot: ids sem --id não colidem no mesmo segundo (N2)', async () => {
  const r1 = await run('snapshot', { root });
  const r2 = await run('snapshot', { root });
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.notEqual(r1.data.id, r2.data.id);
  assert.ok(existsSync(join(root, '_snapshots', r1.data.id)));
  assert.ok(existsSync(join(root, '_snapshots', r2.data.id)));
});

test('snapshot: --restore cria snapshot de segurança antes', async () => {
  await run('snapshot', { root, opt: { id: 'snap1' } });
  const res = await run('snapshot', { root, opt: { restore: 'snap1' } });
  assert.ok(res.data.safety);
  assert.ok(res.data.safety.startsWith('safety-'));
  assert.ok(existsSync(join(root, '_snapshots', res.data.safety)));
});

test('snapshot: --list esconde os snapshots de segurança por padrão (A2)', async () => {
  await run('snapshot', { root, opt: { id: 'snap1' } });
  await run('snapshot', { root, opt: { restore: 'snap1' } }); // gera um safety-*
  const def = await run('snapshot', { root, opt: { list: true } });
  assert.deepEqual(def.data.map((s) => s.id), ['snap1']);
  // --all revela os de segurança.
  const all = await run('snapshot', { root, opt: { list: true, all: true } });
  assert.ok(all.data.some((s) => s.id.startsWith('safety-')));
  assert.ok(all.data.length > def.data.length);
});

test('snapshot: não recursa _snapshots num novo snapshot', async () => {
  await run('snapshot', { root, opt: { id: 'snap1' } });
  const res = await run('snapshot', { root, opt: { id: 'snap2' } });
  // snap2 must contain the 2 vault notes, not the copies under snap1.
  assert.equal(res.data.count, 2);
  assert.ok(!existsSync(join(root, '_snapshots', 'snap2', '_snapshots')));
});

test('snapshot: --restore com id inexistente falha (exit 1)', async () => {
  const res = await run('snapshot', { root, opt: { restore: 'ghost' } });
  assert.equal(res.ok, false);
  assert.equal(res.code, 1);
  assert.match(res.lines.join(' '), /no snapshot/);
});

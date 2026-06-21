import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeVault, cleanup, run, runCli, seedNote } from './_helpers.mjs';

let root;
before(() => { root = makeVault(); });
after(() => cleanup(root));

// Comandos de hook reais (os scripts existem em memory-team/hooks/), no formato que o
// install.mjs grava — para os testes de checkHooks baterem na verificação de disco real.
const HOOKS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'hooks').replace(/\\/g, '/');
const hookGroup = (file) => ({ hooks: [{ type: 'command', command: `node "${HOOKS_DIR}/${file}"`, timeout: 30 }] });
const HOOKS_OK = {
  TaskCompleted: [hookGroup('task-completed.mjs')],
  TeammateIdle: [hookGroup('teammate-idle.mjs')],
};

// Caminho absoluto deste próprio arquivo de teste — um script que comprovadamente existe.
const SELF = new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

/** Escreve um settings.json temporário e devolve o caminho. */
function tempSettings(obj) {
  const dir = mkdtempSync(join(tmpdir(), 'mem-settings-'));
  const file = join(dir, 'settings.json');
  writeFileSync(file, JSON.stringify(obj, null, 2));
  return { dir, file };
}

/** Semeia uma nota com frontmatter válido na partição testproj. */
function seedGood(r, name = '2026-01-01-good.md') {
  seedNote(r, 'testproj', 'memory', name,
    { type: 'memory', agent: 'a', project: 'testproj', summary: 'fine', created: '2026-01-01' }, '# good');
}

test('doctor: vault vazio → 7 checks; sem fail por warnings', async () => {
  const res = await run('doctor', { root, opt: { settings: join(tmpdir(), 'no-settings-x.json') } });
  // vault, settings.json, config, partition, notes, hooks, statusline
  assert.equal(res.data.checks.length, 7);
  // sem settings: hooks/statusline/settings/config viram warn — nenhum fail.
  assert.ok(!res.data.checks.some((c) => c.status === 'fail'));
  assert.equal(res.ok, true);
  assert.equal(res.code ?? 0, 0);
  assert.equal(res.data.checks.find((c) => c.name === 'vault').status, 'ok');
});

test('doctor: instalação completa (hooks + statusline + nota válida) → tudo ok, exit 0', async () => {
  const r = makeVault();
  seedGood(r);
  const { dir, file } = tempSettings({
    hooks: HOOKS_OK,
    statusLine: { type: 'command', command: `node "${SELF}"` },
  });
  try {
    const res = await run('doctor', { root: r, opt: { settings: file } });
    assert.equal(res.ok, true);
    assert.equal(res.code ?? 0, 0);
    assert.ok(!res.data.checks.some((c) => c.status === 'fail'));
    for (const name of ['vault', 'settings.json', 'partition', 'notes', 'hooks', 'statusline']) {
      assert.equal(res.data.checks.find((c) => c.name === name).status, 'ok', `${name} deveria ser ok`);
    }
  } finally {
    cleanup(r);
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor: nota válida semeada → check de notas ok', async () => {
  const r = makeVault();
  try {
    seedGood(r);
    const res = await run('doctor', { root: r });
    const notes = res.data.checks.find((c) => c.name === 'notes');
    assert.equal(notes.status, 'ok');
    assert.match(notes.detail, /1 notas/);
  } finally {
    cleanup(r);
  }
});

test('doctor: nota inválida → notes reflete validate (warn) sem reimplementar lint', async () => {
  const r = makeVault();
  try {
    // type inválido + summary vazio: exatamente o que `validate` reprova.
    seedNote(r, 'testproj', 'memory', '2026-01-01-bad.md',
      { type: 'wrongtype', agent: 'a', project: 'testproj', summary: '', created: '2026-01-01' }, '# bad');
    const res = await run('doctor', { root: r });
    const notes = res.data.checks.find((c) => c.name === 'notes');
    assert.equal(notes.status, 'warn');
    assert.match(notes.detail, /1 com problema/);
    // notes é warn (não fail) → não derruba o exit; o doctor não bloqueia por lint de nota.
    assert.equal(res.ok, true);
  } finally {
    cleanup(r);
  }
});

test('doctor: settings com statusLine válido → ✓', async () => {
  const { dir, file } = tempSettings({ statusLine: { type: 'command', command: `node "${SELF}"` } });
  try {
    const res = await run('doctor', { root, opt: { settings: file } });
    assert.equal(res.data.checks.find((c) => c.name === 'statusline').status, 'ok');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor: settings sem statusLine → statusline ⚠', async () => {
  const { dir, file } = tempSettings({ hooks: HOOKS_OK });
  try {
    const res = await run('doctor', { root, opt: { settings: file } });
    assert.equal(res.data.checks.find((c) => c.name === 'statusline').status, 'warn');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor: settings inexistente → statusline ⚠ não configurado', async () => {
  const res = await run('doctor', { root, opt: { settings: join(tmpdir(), 'no-such-settings-xyz.json') } });
  const sl = res.data.checks.find((c) => c.name === 'statusline');
  assert.equal(sl.status, 'warn');
  assert.match(sl.detail, /não configurado/);
});

test('doctor: statusLine apontando para script inexistente → ✗ (fail, exit 1)', async () => {
  const { dir, file } = tempSettings({
    hooks: HOOKS_OK,
    statusLine: { type: 'command', command: 'node "/path/que/nao/existe/statusline.mjs"' },
  });
  try {
    const res = await run('doctor', { root, opt: { settings: file } });
    assert.equal(res.data.checks.find((c) => c.name === 'statusline').status, 'fail');
    assert.equal(res.ok, false);
    assert.equal(res.code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor: settings inválido → settings.json ✗ (exit 1)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'mem-settings-'));
  const file = join(dir, 'settings.json');
  writeFileSync(file, '{ not valid json,,,');
  try {
    const res = await run('doctor', { root, opt: { settings: file } });
    assert.equal(res.data.checks.find((c) => c.name === 'settings.json').status, 'fail');
    assert.equal(res.ok, false);
    assert.equal(res.code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor: ambos os hooks registrados + no disco → ✓', async () => {
  const { dir, file } = tempSettings({ hooks: HOOKS_OK });
  try {
    const res = await run('doctor', { root, opt: { settings: file } });
    const h = res.data.checks.find((c) => c.name === 'hooks');
    assert.equal(h.status, 'ok');
    assert.match(h.detail, /TaskCompleted/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor: hook faltando → ✗ fail e exit 1', async () => {
  const { dir, file } = tempSettings({ hooks: { TaskCompleted: HOOKS_OK.TaskCompleted } });
  try {
    const res = await run('doctor', { root, opt: { settings: file } });
    const h = res.data.checks.find((c) => c.name === 'hooks');
    assert.equal(h.status, 'fail');
    assert.match(h.detail, /TeammateIdle não registrado/);
    assert.equal(res.ok, false);
    assert.equal(res.code, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor: settings sem bloco hooks → hooks ✗ (exit 1)', async () => {
  const { dir, file } = tempSettings({ model: 'opus' });
  try {
    const res = await run('doctor', { root, opt: { settings: file } });
    const h = res.data.checks.find((c) => c.name === 'hooks');
    assert.equal(h.status, 'fail');
    assert.equal(res.ok, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('doctor: --json shape { ok, checks:[{name,status,detail}] }', async () => {
  const res = await run('doctor', { root, opt: { json: true } });
  assert.equal(typeof res.data.ok, 'boolean');
  assert.ok(Array.isArray(res.data.checks));
  for (const c of res.data.checks) {
    assert.equal(typeof c.name, 'string');
    assert.ok(['ok', 'warn', 'fail'].includes(c.status));
    assert.equal(typeof c.detail, 'string');
  }
});

test('doctor: ROOT inexistente → exit 1 via runCli', () => {
  const ghost = join(tmpdir(), 'mem-vault-ghost-doctor-zzz');
  rmSync(ghost, { recursive: true, force: true });
  const r = runCli(['doctor'], { root: ghost });
  assert.equal(r.code, 1);
  assert.match(r.stdout, /✗ vault/);
  rmSync(ghost, { recursive: true, force: true });
});

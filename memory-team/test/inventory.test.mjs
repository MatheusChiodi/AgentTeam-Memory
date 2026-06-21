import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCommands } from '../commands/registry.mjs';

// Inventory / regression gate (US-070). Proves BOTH directions at once:
//  - every Fase 3 tool was actually registered (nothing silently failed to load);
//  - every base tool from Fases 0/1/2 is still present with an intact contract.
// The registry is auto-discovery, so a malformed command file would just be skipped —
// this test turns that silent skip into a loud failure.

const BASE = [
  'archive', 'backlinks', 'config', 'dedupe', 'digest', 'doctor', 'enable', 'export',
  'graph', 'import', 'index', 'links', 'list', 'move', 'orphans', 'pin', 'prune',
  'recent', 'relate', 'rename', 'retag', 'save', 'search', 'show', 'snapshot', 'stats',
  'tag', 'tags', 'template', 'timeline', 'usage', 'validate', 'watch', 'where',
];

const PHASE3 = [
  // visual
  'diagram', 'dashboard', 'tree', 'activity', 'heatmap',
  // tokens
  'brief', 'tokens', 'focus', 'tldr', 'recap',
  // fluxo
  'plan', 'standup', 'handoff', 'todo', 'roadmap',
  // conhecimento
  'blockers', 'glossary', 'progress', 'changelog', 'mindmap',
];

// Forensic watermark commands (authorship provenance + canary verification).
const WATERMARK = ['whoami', 'verify'];

test('inventory: every base (Fases 0/1/2) command still registered — no regression', async () => {
  const cmds = await loadCommands();
  for (const name of BASE) assert.ok(cmds.has(name), `base command missing: ${name}`);
  assert.equal(BASE.length, 34);
});

test('inventory: every Fase 3 command registered (all 20 added)', async () => {
  const cmds = await loadCommands();
  for (const name of PHASE3) assert.ok(cmds.has(name), `phase-3 command missing: ${name}`);
  assert.equal(PHASE3.length, 20);
});

test('inventory: every watermark command registered (whoami + verify)', async () => {
  const cmds = await loadCommands();
  for (const name of WATERMARK) assert.ok(cmds.has(name), `watermark command missing: ${name}`);
  assert.equal(WATERMARK.length, 2);
});

test('inventory: total command count is exactly 56 (34 base + 20 phase-3 + 2 watermark)', async () => {
  const cmds = await loadCommands();
  assert.equal(cmds.size, 56, `expected exactly 56 commands, got ${cmds.size}`);
});

test('inventory: every command honors the contract (name/summary/usage/run)', async () => {
  const cmds = await loadCommands();
  for (const [name, cmd] of cmds) {
    assert.equal(cmd.name, name, `name mismatch for ${name}`);
    assert.equal(typeof cmd.run, 'function', `${name} missing run()`);
    assert.equal(typeof cmd.summary, 'string', `${name} missing summary`);
    assert.ok(cmd.summary.length > 0, `${name} has empty summary`);
    assert.equal(typeof cmd.usage, 'string', `${name} missing usage`);
  }
});

test('inventory: no command name collisions across base + phase 3 + watermark', () => {
  const all = [...BASE, ...PHASE3, ...WATERMARK];
  assert.equal(new Set(all).size, all.length, 'duplicate command name in the expected inventory');
});

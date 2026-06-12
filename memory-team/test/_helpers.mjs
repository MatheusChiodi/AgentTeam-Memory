// _helpers.mjs — shared test utilities. Creates throwaway vaults under os.tmpdir()
// and runs commands in-process (fast) or as a real subprocess (e2e). No mocks: the
// commands hit a real filesystem, just an isolated temp one.

import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { loadCommands } from '../commands/registry.mjs';
import { buildCtx } from '../commands/_ctx.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const MEMORY_CLI = join(HERE, '..', 'memory.mjs');

let COMMANDS;
export async function getCommands() {
  if (!COMMANDS) COMMANDS = await loadCommands();
  return COMMANDS;
}

/** Make an isolated temp vault root. Returns a forward-slash path. */
export function makeVault() {
  return mkdtempSync(join(tmpdir(), 'mem-vault-')).replace(/\\/g, '/');
}

export function cleanup(root) {
  try { rmSync(root, { recursive: true, force: true }); } catch { /* noop */ }
}

/** Run a command in-process against an injected vault root/project. */
export async function run(name, { pos = [], opt = {}, root, project = 'testproj' } = {}) {
  const commands = await getCommands();
  const cmd = commands.get(name);
  if (!cmd) throw new Error(`unknown command in test: ${name}`);
  const ctx = buildCtx({ pos, opt, root, project });
  let res = cmd.run(ctx);
  if (res instanceof Promise) res = await res;
  return res;
}

/** Run the real CLI as a subprocess (exercises the dispatcher + registry). */
export function runCli(args, { root, project = 'testproj' } = {}) {
  const env = { ...process.env, MEMORY_VAULT: root, MEMORY_PROJECT: project };
  try {
    const stdout = execFileSync(process.execPath, [MEMORY_CLI, ...args], { env, encoding: 'utf8' });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status ?? 1, stdout: e.stdout || '', stderr: e.stderr || '' };
  }
}

/** Seed a note directly on disk (bypasses `save`) for read-side tests. */
export function seedNote(root, project, sub, filename, fm = {}, body = '') {
  const dir = join(root, 'projects', project, sub);
  mkdirSync(dir, { recursive: true });
  const front = Object.entries(fm).map(([k, v]) => {
    if (Array.isArray(v)) return `${k}: [${v.join(', ')}]`;
    return `${k}: ${v}`;
  }).join('\n');
  const file = join(dir, filename);
  writeFileSync(file, `---\n${front}\n---\n\n${body}\n`, 'utf8');
  return file;
}

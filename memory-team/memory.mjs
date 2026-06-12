#!/usr/bin/env node
// memory.mjs — memory CLI for the memory-team system (central, per-project vault).
// Thin dispatcher: parses argv, builds the execution context, and delegates to a
// command module discovered under ./commands. No external dependencies. ESM.
//
// Usage (run from your PROJECT folder — the project is auto-detected from the cwd):
//   node memory.mjs <command> [args] [--flags]
//   node memory.mjs help            # list every command
//   node memory.mjs <command> --json # machine-readable output (read commands)
//
// Note types: memory | decision | learning | communication | state

import { parseArgs, buildCtx } from './commands/_ctx.mjs';
import { loadCommands } from './commands/registry.mjs';
import { vaultRoot, projectName, TYPES } from './lib.mjs';

const commands = await loadCommands();

function helpText() {
  const ROOT = vaultRoot();
  const PROJECT = projectName();
  const names = [...commands.values()].sort((a, b) => a.name.localeCompare(b.name));
  const width = Math.max(...names.map((c) => (c.usage || c.name).length));
  const rows = names.map((c) => `  ${(c.usage || c.name).padEnd(width)}  ${c.summary || ''}`);
  return [
    'usage: node memory.mjs <command> [args] [--flags]', '',
    'commands:', ...rows, '',
    `types: ${TYPES.join(' | ')}`,
    `vault: ${ROOT}   project: ${PROJECT}`,
  ].join('\n');
}

const { pos, opt } = parseArgs(process.argv.slice(2));
const name = pos[0];

if (!name || name === 'help' || opt.help === true) {
  console.log(helpText());
  process.exit(0);
}

const cmd = commands.get(name);
if (!cmd) {
  console.error(`unknown command: ${name}\n`);
  console.log(helpText());
  process.exit(1);
}

const ctx = buildCtx({ pos: pos.slice(1), opt });
let res;
try {
  res = cmd.run(ctx);
  if (res instanceof Promise) res = await res;
} catch (e) {
  console.error(`error in "${name}": ${e && e.message ? e.message : e}`);
  process.exit(1);
}

if (res) {
  if (ctx.json && res.data !== undefined) console.log(JSON.stringify(res.data, null, 2));
  else if (res.lines && res.lines.length) console.log(res.lines.join('\n'));
  if (res.code) process.exitCode = res.code;
}

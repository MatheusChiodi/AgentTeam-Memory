// _ctx.mjs — argument parsing + execution context shared by every command.
// A command is `{ name, summary, usage, run(ctx) }` where run returns
// `{ ok, code?, lines?, data? }`. Keeping ROOT/PROJECT on the ctx (instead of
// reading process env inside each command) is what makes commands unit-testable:
// a test just passes `{ root, project }` pointing at a temp vault.

import { vaultRoot, projectName } from '../lib.mjs';

/** Tiny flag parser: `--key value` (or boolean `--key`), positionals collected in order. */
export function parseArgs(argv) {
  const pos = [];
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const next = argv[i + 1];
      opt[a.slice(2)] = next != null && !next.startsWith('--') ? argv[++i] : true;
    } else pos.push(a);
  }
  return { pos, opt };
}

/** Build the execution context. `root`/`project` override env resolution (for tests). */
export function buildCtx({ pos = [], opt = {}, root, project } = {}) {
  return {
    ROOT: root || vaultRoot(),
    PROJECT: project || projectName(),
    pos,
    opt,
    json: opt.json === true,
    all: opt.all === true,
  };
}

/** Convenience for commands: a uniform error result. */
export function fail(message, code = 1) {
  return { ok: false, code, lines: [message], data: { error: message } };
}

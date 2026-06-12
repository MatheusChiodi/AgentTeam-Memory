// registry.mjs — auto-discovers every command module in this folder.
// A command file just `export default { name, summary, usage, run }`; dropping a new
// file here registers it automatically (no central edit → no merge conflicts between
// parallel contributors). Files starting with `_` and this file itself are skipped.

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export async function loadCommands() {
  const files = readdirSync(HERE)
    .filter((f) => f.endsWith('.mjs') && !f.startsWith('_') && f !== 'registry.mjs')
    .sort();
  const map = new Map();
  for (const f of files) {
    const mod = await import(pathToFileURL(join(HERE, f)).href);
    const cmd = mod.default;
    if (cmd && cmd.name && typeof cmd.run === 'function') map.set(cmd.name, cmd);
  }
  return map;
}

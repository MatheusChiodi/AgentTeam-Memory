// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// config — read/adjust memory-team preferences, persisted in <vault>/config.json.
// The file is a flat key→value map (keys like `statusline.warn`), the exact shape
// statusline.mjs reads — so `config set` is what makes those thresholds tunable
// without touching code. DEFAULTS/loadConfig are exported for reuse by other tools.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fail } from './_ctx.mjs';

// Known keys with their built-in defaults. Same keys statusline.mjs consumes,
// plus the custom date format. Unknown keys are accepted on `set` but warned.
export const DEFAULTS = {
  'statusline.warn': 70,
  'statusline.danger': 90,
  'statusline.barWidth': 10,
  'date.format': 'YYYY-MM-DD',
};

const configPath = (root) => join(root, 'config.json');

/** Read the persisted overrides only (no defaults merged). Corrupt → {}. */
function readOverrides(root) {
  try {
    const f = configPath(root);
    if (existsSync(f)) {
      const parsed = JSON.parse(readFileSync(f, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch { /* broken config → treat as no overrides */ }
  return {};
}

/** Effective config: built-in defaults overlaid with persisted overrides. */
export function loadConfig(root) {
  return { ...DEFAULTS, ...readOverrides(root) };
}

// "true"/"false" → boolean, numeric strings → number, everything else stays a string.
function coerce(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw !== '' && raw != null && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}

export default {
  name: 'config',
  summary: 'Read/adjust memory-team preferences (config list|get|set), persisted in config.json',
  usage: 'config list | config get <key> | config set <key> <value> [--json]',
  run(ctx) {
    const { ROOT } = ctx;
    const sub = ctx.pos[0];
    const cfg = loadConfig(ROOT);

    if (!sub || sub === 'list') {
      const overrides = readOverrides(ROOT);
      const lines = Object.keys(cfg).sort().map((k) => {
        const origin = Object.prototype.hasOwnProperty.call(overrides, k) ? 'override' : 'default';
        return `${k} = ${cfg[k]} (${origin})`;
      });
      return { ok: true, lines, data: cfg };
    }

    if (sub === 'get') {
      const key = ctx.pos[1];
      if (!key) return fail('config get <key>');
      const has = Object.prototype.hasOwnProperty.call(cfg, key);
      const value = has ? cfg[key] : '';
      // --json returns the whole effective config (consistent with list).
      return { ok: true, lines: [has ? String(value) : ''], data: ctx.json ? cfg : { [key]: value } };
    }

    if (sub === 'set') {
      const key = ctx.pos[1];
      const raw = ctx.pos[2];
      if (!key || raw == null) return fail('config set <key> <value>');
      const value = coerce(raw);
      const overrides = readOverrides(ROOT);
      overrides[key] = value;
      writeFileSync(configPath(ROOT), `${JSON.stringify(overrides, null, 2)}\n`, 'utf8');

      const known = Object.prototype.hasOwnProperty.call(DEFAULTS, key);
      const lines = [`${key} = ${value}`];
      if (!known) lines.push(`warning: '${key}' is not a known key (accepted anyway)`);
      return { ok: true, lines, data: loadConfig(ROOT) };
    }

    return fail(`unknown config subcommand: ${sub} (use list|get|set)`);
  },
};

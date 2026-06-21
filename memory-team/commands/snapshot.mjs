// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// snapshot — checkpoint the whole vault into <ROOT>/_snapshots/<id>/ and restore from it.
// A snapshot is a plain copy of every note (.md), preserving its path relative to ROOT.
// Restoring is a TRUE reset (US-044): it wipes the live vault and re-lays the checkpoint,
// so notes added after the snapshot (e.g. a botched mass `import`) are actually undone.
// It is destructive (US-031): requires the explicit --restore flag and auto-takes a
// safety snapshot of the current state first, so a wrong reset is always recoverable.
import {
  copyFileSync, existsSync, readdirSync, statSync, rmSync,
} from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { walk, ensure } from '../lib.mjs';
import { fail } from './_ctx.mjs';

const SNAP_DIR = '_snapshots';

/** Compact sortable id: YYYYMMDD-HHMMSS (local time), with an anti-collision suffix. */
function stamp(root, prefix = '') {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const base = `${prefix}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
    + `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  // Two snapshots in the same second would otherwise share an id and silently overwrite
  // each other (mirrors how `save` disambiguates same-day slugs).
  if (!root || !existsSync(join(snapBase(root), base))) return base;
  let i = 2;
  while (existsSync(join(snapBase(root), `${base}-${i}`))) i++;
  return `${base}-${i}`;
}

const snapBase = (root) => join(root, SNAP_DIR);
const rel = (from, file) => relative(from, file).replace(/\\/g, '/');

/** Every note in the vault except those living under _snapshots (never recurse into backups). */
function vaultNotes(root) {
  return walk(root).filter((f) => !rel(root, f).startsWith(`${SNAP_DIR}/`));
}

/** Copy a list of files into `destBase`, preserving their path relative to `srcBase`. */
function copyInto(srcBase, files, destBase) {
  let count = 0;
  for (const f of files) {
    const dest = join(destBase, rel(srcBase, f));
    ensure(dirname(dest));
    copyFileSync(f, dest);
    count++;
  }
  return count;
}

const SAFETY_PREFIX = 'safety-';

/**
 * List existing snapshots (id, mtime date, note count), newest first.
 * Safety snapshots (auto-taken before a restore) are hidden by default so they don't
 * bury the intentional checkpoints (A2); pass `includeSafety` to surface them.
 */
function listSnapshots(root, { includeSafety = false } = {}) {
  const base = snapBase(root);
  if (!existsSync(base)) return [];
  return readdirSync(base)
    .filter((id) => {
      if (!includeSafety && id.startsWith(SAFETY_PREFIX)) return false;
      try { return statSync(join(base, id)).isDirectory(); } catch { return false; }
    })
    .map((id) => {
      const dir = join(base, id);
      const count = walk(dir).length;
      let date = '';
      try { date = new Date(statSync(dir).mtimeMs).toISOString().slice(0, 10); } catch { /* noop */ }
      return { id, date, count };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** Create a snapshot named `id` from the current vault. */
function create(root, id) {
  const dest = join(snapBase(root), id);
  ensure(dest);
  const count = copyInto(root, vaultNotes(root), dest);
  return { id, path: rel(root, dest), count };
}

export default {
  name: 'snapshot',
  summary: 'Checkpoint the vault to _snapshots/<id>; --list shows them; --restore <id> rolls back',
  usage: 'snapshot [--id <id>] | snapshot --list [--all] | snapshot --restore <id>',
  run(ctx) {
    const { ROOT, opt } = ctx;

    if (opt.list === true) {
      const snaps = listSnapshots(ROOT, { includeSafety: ctx.all });
      const lines = snaps.length
        ? snaps.map((s) => `${s.id}  ${s.date}  (${s.count} notes)`)
        : ['no snapshots'];
      return { ok: true, lines, data: snaps };
    }

    if (opt.restore != null && opt.restore !== false) {
      // Destructive (US-031): only runs because --restore was passed explicitly.
      const id = typeof opt.restore === 'string' ? opt.restore : String(ctx.pos[0] || '');
      if (!id) return fail('usage: snapshot --restore <id>');
      const src = join(snapBase(ROOT), id);
      if (!existsSync(src) || !statSync(src).isDirectory()) {
        return fail(`no snapshot "${id}"`);
      }
      // Safety net: snapshot the current state before touching it, so the reset below is
      // always reversible (the safety id is returned for an undo).
      const safety = create(ROOT, stamp(ROOT, 'safety-'));
      // True reset (US-044): wipe the live notes, then re-lay the checkpoint. Without the
      // wipe this would be a merge — notes added after the snapshot would survive and the
      // "undo a botched import" use case would silently fail.
      const before = vaultNotes(ROOT);
      for (const f of before) rmSync(f, { force: true });
      const restored = copyInto(src, walk(src), ROOT);
      return {
        ok: true,
        lines: [`restored ${restored} notes from ${id} (was ${before.length}; safety: ${safety.id})`],
        data: { id, count: restored, before: before.length, safety: safety.id },
      };
    }

    const id = typeof opt.id === 'string' ? opt.id : stamp(ROOT);
    const res = create(ROOT, id);
    return { ok: true, lines: [`snapshot ${res.id} — ${res.count} notes → ${res.path}`], data: res };
  },
};

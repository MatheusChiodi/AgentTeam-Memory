// where — show vault path, detected project, enabled status, note count.
import { existsSync } from 'node:fs';
import {
  partition, isEnabled, enforceGlobal, projectDir, listProjects, walk,
} from '../lib.mjs';

export default {
  name: 'where',
  summary: 'Show vault path, detected project, enabled status and note count',
  usage: 'where',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const p = partition(ROOT, PROJECT);
    const notes = existsSync(p.base) ? walk(p.base).length : 0;
    const enabled = isEnabled();
    const global = enforceGlobal();
    const enabledLabel = global
      ? 'yes (global — hooks enforce everywhere)'
      : enabled ? 'yes (hooks enforce)' : 'no (hooks fail-open — run: enable)';
    const projects = listProjects(ROOT);
    const lines = [
      `vault root : ${ROOT}`,
      `project    : ${PROJECT}`,
      `project dir: ${projectDir()}`,
      `enabled    : ${enabledLabel}`,
      `notes      : ${notes} in projects/${PROJECT}`,
      `projects   : ${projects.join(', ') || '(none yet)'}`,
    ];
    return {
      ok: true,
      lines,
      data: {
        vaultRoot: ROOT, project: PROJECT, projectDir: projectDir(), enabled, global, notes, projects,
      },
    };
  },
};

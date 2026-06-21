// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// enable — opt-in: write the `.memory-team` marker so the hooks enforce memory here.
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  projectDir, today, ensurePartition,
} from '../lib.mjs';

export default {
  name: 'enable',
  summary: 'Opt-in: make the TaskCompleted/TeammateIdle hooks enforce memory in this project',
  usage: 'enable',
  run(ctx) {
    const { ROOT, PROJECT } = ctx;
    const cwd = projectDir();
    const marker = join(cwd, '.memory-team');
    ensurePartition(ROOT, PROJECT);
    if (!existsSync(marker)) {
      writeFileSync(marker, `project: ${PROJECT}\nvault: ${ROOT}\nenabled: ${today()}\n`
        + '# Marks this project as memory-team enabled (TaskCompleted/TeammateIdle hooks enforce here).\n', 'utf8');
    }
    return {
      ok: true,
      lines: [`enabled "${PROJECT}" -> partition projects/${PROJECT} ready; marker .memory-team written.`],
      data: { project: PROJECT, marker, enabled: true },
    };
  },
};

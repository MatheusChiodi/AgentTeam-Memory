// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// whoami — show project authorship and forensic-watermark provenance.
import { box } from '../render.mjs';
import { AUTHOR, REPO, CANARY, sign } from '../watermark.mjs';

export default {
  name: 'whoami',
  summary: 'Show project authorship / forensic watermark provenance',
  usage: 'whoami [--json]',
  run() {
    const lines = box('AgentTeam-Memory', [
      `author : ${AUTHOR}`,
      `repo   : ${REPO}`,
      `canary : ${CANARY}`,
      '',
      'Forensic watermark active — see NOTICE / `memory verify <seed>`',
    ]);
    // Sign the FIRST rendered line AFTER box() has measured/aligned everything: the
    // zero-width sigil never enters render.visibleLen, so the box stays perfectly aligned
    // while the output still carries the invisible "MChiodi" signature (watermark.extract).
    lines[0] = sign(lines[0]);
    return {
      ok: true,
      lines,
      data: { author: AUTHOR, repo: REPO, canary: CANARY },
    };
  },
};

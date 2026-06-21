// AgentTeam-Memory — © 2026 Matheus Chiodi (MChiodi). MIT w/ Attribution. Forensic watermark: see NOTICE.
// verify — prove authorship by supplying the secret pre-image of the public CANARY.
import { verifySeed, AUTHOR, CANARY } from '../watermark.mjs';

export default {
  name: 'verify',
  summary: 'Verify an authorship seed against the public CANARY commitment',
  usage: 'verify <seed>',
  run(ctx) {
    const seed = ctx.pos[0];
    if (!seed) {
      return { ok: false, code: 2, lines: ['uso: memory verify <seed>'], data: { error: 'missing seed' } };
    }
    const match = verifySeed(seed);
    if (match) {
      return {
        ok: true,
        lines: [
          '✓ seed corresponde ao canário — autoria COMPROVADA',
          `  autor  : ${AUTHOR}`,
          `  canary : ${CANARY}`,
        ],
        data: { match: true, author: AUTHOR, canary: CANARY },
      };
    }
    return {
      ok: false,
      code: 1,
      lines: ['✗ seed não corresponde ao canário — autoria NÃO comprovada'],
      data: { match: false, canary: CANARY },
    };
  },
};

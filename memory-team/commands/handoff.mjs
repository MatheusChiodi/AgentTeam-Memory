// handoff — assemble a session-to-session handoff packet. Agent teams have no
// resume, so this packet IS the continuity: latest `state` per agent + open
// checkboxes across notes + pins + recent decisions, emitted as cohesive markdown
// ready to paste at the start of the next session. `--save` persists it as a
// memory note (tag `handoff`) with wikilinks back to the sources.
import { collectNotes, isPinned, saveNote } from '../notes.mjs';
import { extractCheckboxes } from '../analyze.mjs';

const MAX_DECISIONS = 8;

export default {
  name: 'handoff',
  summary: 'Assemble a handoff packet (states, open items, pins, recent decisions)',
  usage: 'handoff [--save] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope);

    // Latest state per agent (most recent created wins).
    const stateByAgent = new Map();
    for (const n of notes) {
      if ((n.fm.type || '') !== 'state') continue;
      const agent = n.fm.agent || 'unknown';
      const prev = stateByAgent.get(agent);
      if (!prev || (n.created || '') >= (prev.created || '')) {
        stateByAgent.set(agent, { agent, name: n.name, summary: n.fm.summary || '', created: n.created || '' });
      }
    }
    const states = [...stateByAgent.values()].sort((a, b) => a.agent.localeCompare(b.agent));

    // Open checkboxes across every note body (shared extractor with todo/progress).
    const open = [];
    for (const n of notes) {
      for (const cb of extractCheckboxes(n.body)) {
        if (!cb.checked) open.push({ note: n.name, text: cb.text });
      }
    }

    // Pins and recent decisions (newest first, capped).
    const pins = notes.filter(isPinned)
      .sort((a, b) => (b.created || '').localeCompare(a.created || ''))
      .map((n) => ({ name: n.name, summary: n.fm.summary || '' }));
    const decisions = notes.filter((n) => (n.fm.type || '') === 'decision')
      .sort((a, b) => (b.created || '').localeCompare(a.created || ''))
      .slice(0, MAX_DECISIONS)
      .map((n) => ({ name: n.name, summary: n.fm.summary || '' }));

    const data = { states, open, pins, decisions };

    const body = [];
    body.push('## State per agent');
    if (states.length) for (const s of states) body.push(`- **${s.agent}** ([[${s.name}]]): ${s.summary}`.trimEnd());
    else body.push('- (no state recorded)');
    body.push('');
    body.push('## Open items');
    if (open.length) for (const o of open) body.push(`- [ ] ${o.text}  ([[${o.note}]])`);
    else body.push('- (no open items)');
    body.push('');
    body.push('## Pins');
    if (pins.length) for (const p of pins) body.push(`- [[${p.name}]] — ${p.summary}`.trimEnd());
    else body.push('- (no pins)');
    body.push('');
    body.push('## Recent decisions');
    if (decisions.length) for (const d of decisions) body.push(`- [[${d.name}]] — ${d.summary}`.trimEnd());
    else body.push('- (no decisions)');

    if (opt.save === true) {
      // related → wikilinks to every source so the packet is navigable in Obsidian.
      const related = [...new Set([
        ...states.map((s) => s.name),
        ...pins.map((p) => p.name),
        ...decisions.map((d) => d.name),
      ])].map((name) => `[[${name}]]`);
      const { file } = saveNote(ROOT, PROJECT, {
        type: 'memory',
        title: 'Handoff packet',
        summary: 'Handoff packet: states, open items, pins and decisions.',
        tags: ['handoff'],
        related,
        agent: opt.agent || 'unknown',
        body: body.join('\n'),
      });
      data.path = file;
      return { ok: true, lines: [`# handoff saved (${file})`, '', ...body], data };
    }

    return { ok: true, lines: ['# Handoff packet', '', ...body], data };
  },
};

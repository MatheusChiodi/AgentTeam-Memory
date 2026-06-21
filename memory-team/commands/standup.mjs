// standup — cross-agent daily: what each agent produced in a time window.
// Groups window notes (created >= since) by agent; per agent reports deliverables
// (`type: title`), a count, and the most recent known `state` note. Lets the lead
// run a "daily" without asking anyone. Window default = today (injectable via
// --today for deterministic tests).
import { collectNotes } from '../notes.mjs';
import { today as todayFn } from '../lib.mjs';

export default {
  name: 'standup',
  summary: 'Per-agent summary of what was produced in a window',
  usage: 'standup [--since YYYY-MM-DD] [--today YYYY-MM-DD] [--all] [--json]',
  run(ctx) {
    const { ROOT, PROJECT, opt } = ctx;
    // "today" is injectable so tests never read the wall clock; --since defaults to it.
    const now = typeof opt.today === 'string' ? opt.today : todayFn();
    const since = typeof opt.since === 'string' ? opt.since : now;

    const scope = ctx.all ? { all: true } : { project: PROJECT };
    const notes = collectNotes(ROOT, scope).filter((n) => n.created && n.created >= since);

    // Bucket by agent. Track latest state separately (most recent type:state note).
    const byAgent = new Map();
    const ensure = (a) => {
      if (!byAgent.has(a)) byAgent.set(a, { agent: a, count: 0, items: [], lastState: null, _stateDate: '' });
      return byAgent.get(a);
    };
    for (const n of notes) {
      const agent = n.fm.agent || 'unknown';
      const bucket = ensure(agent);
      bucket.count += 1;
      const type = n.fm.type || 'memory';
      bucket.items.push(`${type}: ${n.name}`);
      if (type === 'state' && n.created >= bucket._stateDate) {
        bucket._stateDate = n.created;
        bucket.lastState = { title: n.name, summary: n.fm.summary || '' };
      }
    }

    const data = [...byAgent.values()]
      .map(({ _stateDate, ...rest }) => { void _stateDate; return rest; })
      .sort((a, b) => b.count - a.count || a.agent.localeCompare(b.agent));

    if (!data.length) {
      return { ok: true, lines: [`no agent active in the window (since ${since})`], data };
    }

    const lines = [`# standup (since ${since}) — ${data.length} agent(s)`, ''];
    for (const a of data) {
      lines.push(`## ${a.agent} (${a.count})`);
      for (const item of a.items) lines.push(`- ${item}`);
      if (a.lastState) lines.push(`- last state: ${a.lastState.title} — ${a.lastState.summary}`.trimEnd());
      lines.push('');
    }
    return { ok: true, lines, data };
  },
};

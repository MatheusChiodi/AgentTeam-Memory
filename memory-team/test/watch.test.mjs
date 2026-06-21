import { test } from 'node:test';
import assert from 'node:assert/strict';
import watch, { formatWatchLine, run } from '../commands/watch.mjs';

// A fixed time so the HH:MM prefix is deterministic across machines/timezones.
const AT = new Date(2026, 5, 20, 9, 5, 0); // local 09:05

const note = (fm, body = '') => ({ name: '2026-06-20-foo', fm, body });

test('formatWatchLine: full note → HH:MM type/agent — title — summary', () => {
  const n = note({ type: 'memory', agent: 'executor', summary: 'did a thing' },
    '# Real Title\nbody');
  assert.equal(formatWatchLine(n, AT), '09:05 memory/executor — Real Title — did a thing');
});

test('formatWatchLine: no summary → no trailing suffix', () => {
  const n = note({ type: 'decision', agent: 'lead' }, '# Picked X');
  assert.equal(formatWatchLine(n, AT), '09:05 decision/lead — Picked X');
});

test('formatWatchLine: blank summary is treated as absent', () => {
  const n = note({ type: 'state', agent: 'reviewer', summary: '   ' }, '# Idle');
  assert.equal(formatWatchLine(n, AT), '09:05 state/reviewer — Idle');
});

test('formatWatchLine: falls back to note name when body has no heading', () => {
  const n = note({ type: 'memory', agent: 'x', summary: 's' }, 'no heading here');
  assert.equal(formatWatchLine(n, AT), '09:05 memory/x — 2026-06-20-foo — s');
});

test('formatWatchLine: missing type/agent degrade to note/?', () => {
  const n = note({ summary: 's' }, 'plain');
  assert.equal(formatWatchLine(n, AT), '09:05 note/? — 2026-06-20-foo — s');
});

test('formatWatchLine: accepts ms epoch and Date as time', () => {
  const n = note({ type: 'memory', agent: 'a' }, '# T');
  assert.equal(formatWatchLine(n, AT.getTime()), '09:05 memory/a — T');
  assert.equal(formatWatchLine(n, AT), '09:05 memory/a — T');
});

test('formatWatchLine: defaults to now when no time given', () => {
  const n = note({ type: 'memory', agent: 'a' }, '# T');
  assert.match(formatWatchLine(n), /^\d{2}:\d{2} memory\/a — T$/);
});

test('module: default export honors the command contract', () => {
  assert.equal(watch.name, 'watch');
  assert.equal(typeof watch.run, 'function');
  assert.equal(typeof watch.usage, 'string');
  assert.equal(typeof watch.summary, 'string');
  assert.equal(watch.run, run);
});

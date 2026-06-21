import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, dateRange, dayOfWeek } from '../lib.mjs';

test('addDays: adds/subtracts across month and year boundaries (UTC)', () => {
  assert.equal(addDays('2026-06-21', 0), '2026-06-21');
  assert.equal(addDays('2026-06-21', -7), '2026-06-14');
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
});

test('dateRange: inclusive range, empty when inverted', () => {
  assert.deepEqual(dateRange('2026-06-01', '2026-06-03'), ['2026-06-01', '2026-06-02', '2026-06-03']);
  assert.deepEqual(dateRange('2026-06-03', '2026-06-01'), []);
  assert.deepEqual(dateRange('2026-06-05', '2026-06-05'), ['2026-06-05']);
});

test('dayOfWeek: known weekdays (0=Sun..6=Sat)', () => {
  assert.equal(dayOfWeek('2026-06-21'), 0); // Sunday
  assert.equal(dayOfWeek('2026-06-22'), 1); // Monday
  assert.equal(dayOfWeek('2026-06-27'), 6); // Saturday
});

test('addDays: large spans stay consistent with dateRange length', () => {
  const range = dateRange('2026-01-01', addDays('2026-01-01', 13));
  assert.equal(range.length, 14);
  assert.equal(range[13], '2026-01-14');
});

test('dayOfWeek: stable regardless of host timezone (uses UTC)', () => {
  // two dates a week apart land on the same weekday
  assert.equal(dayOfWeek('2026-06-21'), dayOfWeek('2026-06-28'));
});

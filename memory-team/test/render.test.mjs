import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bar, sparkline, heatLevels, heatGlyph, box, treeLines, truncate,
  mermaidEscape, mermaidId, visibleLen,
} from '../render.mjs';

// Force plain text so assertions are not polluted by ANSI codes.
process.env.NO_COLOR = '1';

test('bar: clamps to [0,100] and fills proportionally', () => {
  assert.equal(bar(0, 10), '[░░░░░░░░░░]');
  assert.equal(bar(100, 10), '[██████████]');
  assert.equal(bar(50, 10), '[█████░░░░░]');
  // out-of-range clamps, never throws or overflows width
  assert.equal(bar(-20, 4), '[░░░░]');
  assert.equal(bar(999, 4), '[████]');
});

test('sparkline: normalizes to the max; all-zero is flat; empty is empty', () => {
  assert.equal(sparkline([]), '');
  assert.equal(sparkline([0, 0, 0]), '▁▁▁');
  const s = sparkline([0, 5, 10]);
  assert.equal(s.length, 3);
  assert.equal(s[0], '▁');
  assert.equal(s[2], '█'); // the max maps to the top glyph
  // non-numeric coerces to 0, never NaN-indexes
  assert.ok(!sparkline([1, undefined, 2]).includes('undefined'));
});

test('heatLevels: zero→0, quartile buckets for positives, no divide-by-zero', () => {
  assert.deepEqual(heatLevels([0, 0, 0]), [0, 0, 0]);
  // all-equal positives collapse to level 1
  assert.deepEqual(heatLevels([3, 3, 3]), [1, 1, 1]);
  const lv = heatLevels([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(lv[0], 0);
  assert.ok(lv[lv.length - 1] >= lv[1]); // higher count → not-lower level
  assert.ok(lv.every((x) => x >= 0 && x <= 4));
  assert.equal(heatGlyph(0), ' ');
  assert.equal(heatGlyph(4), '█');
  assert.equal(heatGlyph(99), '█'); // clamps
});

test('box: borders enclose content and align to the widest visible line', () => {
  const lines = box('Title', ['short', 'a much longer line']);
  assert.ok(lines[0].startsWith('┌') && lines[0].endsWith('┐'));
  assert.ok(lines[lines.length - 1].startsWith('└') && lines[lines.length - 1].endsWith('┘'));
  // every rendered row has identical visible width (alignment invariant)
  const widths = new Set(lines.map(visibleLen));
  assert.equal(widths.size, 1);
});

test('treeLines: nested nodes get ├─/└─ connectors and indented children', () => {
  const out = treeLines([
    { label: 'a', children: [{ label: 'a1' }, { label: 'a2' }] },
    { label: 'b' },
  ]);
  assert.equal(out[0], '├─ a');
  assert.ok(out[1].includes('├─ a1'));
  assert.ok(out[2].includes('└─ a2'));
  assert.equal(out[3], '└─ b'); // last top-level uses └─
});

test('truncate: keeps short strings, ellipsizes long ones within n', () => {
  assert.equal(truncate('hello', 10), 'hello');
  const t = truncate('abcdefghij', 5);
  assert.ok(t.length <= 5);
  assert.ok(t.endsWith('…'));
});

test('mermaidEscape: neutralizes every parser-breaking character', () => {
  const out = mermaidEscape('a]b"c|d{e}f`g\nh#i');
  assert.ok(!/["[\]{}()|`<>#;]/.test(out));
  assert.ok(!out.includes('\n'));
  assert.equal(mermaidEscape(null), '');
});

test('mermaidId: stable, alnum-only, and distinct for distinct inputs', () => {
  const id1 = mermaidId('My Note!');
  assert.match(id1, /^n_[a-z0-9_]+$/);
  assert.equal(id1, mermaidId('My Note!')); // deterministic
  assert.notEqual(mermaidId('foo'), mermaidId('bar'));
  // titles that slugify identically still differ via the hash suffix
  assert.notEqual(mermaidId('a b'), mermaidId('a  b!'));
});

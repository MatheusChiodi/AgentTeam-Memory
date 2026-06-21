// watermark.test.mjs — forensic watermark: zero-width stego roundtrip, canary verify,
// and the whoami/verify commands. No real seed is ever written here (the canary's
// pre-image is secret and absent from the repo by design).
process.env.NO_COLOR = '1';

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zwEncode, zwDecode, sign, extract, verifySeed, SIGIL, CANARY } from '../watermark.mjs';
import { run } from './_helpers.mjs';

// Built from code points so this test never contains invisible literals either.
const ZW_ZERO = String.fromCodePoint(0x200b);
const ZW_ONE = String.fromCodePoint(0x200c);
const ZW_MARK = String.fromCodePoint(0x200d);
const ZW_RE = new RegExp(`[${ZW_ZERO}${ZW_ONE}${ZW_MARK}]`, 'g');

test('zwEncode/zwDecode: roundtrip preserves the string and stays invisible', () => {
  for (const s of ['MChiodi', 'foo', 'açãoÜ€', '']) {
    assert.equal(zwDecode(zwEncode(s)), s);
  }
  // Encoded form carries no visible characters (only zero-width code points).
  assert.equal(zwEncode('MChiodi').replace(ZW_RE, ''), '');
});

test('zwEncode/zwDecode: multibyte roundtrip (CJK, emoji, accents)', () => {
  for (const s of ['作者', '🔏', 'Matheus Chiodi', 'açãoÜ€🔏作者']) {
    assert.equal(zwDecode(zwEncode(s)), s);
  }
});

test('extract(sign(text)) recovers the embedded "MChiodi"', () => {
  assert.equal(extract(sign('foo')), 'MChiodi');
  // sign() must not alter the visible text.
  assert.equal(sign('foo').replace(SIGIL, ''), 'foo');
});

test('extract returns "" when no sigil is present', () => {
  assert.equal(extract('plain text with no signature'), '');
  assert.equal(extract(''), '');
});

test('zwDecode returns "" when there is no start sentinel (even with zero-width noise)', () => {
  // Zero-width chars present but no sentinel → not a payload, must decode to "".
  assert.equal(zwDecode(`${ZW_ZERO}${ZW_ONE}${ZW_ZERO}foo${ZW_ONE}`), '');
  assert.equal(zwDecode('no zero width at all'), '');
});

test('extract is noise-tolerant: stray zero-width never yields a false positive', () => {
  const noise = `${ZW_ZERO}${ZW_ONE}${ZW_ZERO}`;
  // Stray bits before a real sigil: extract still recovers exactly "MChiodi", no garbage.
  assert.equal(extract(`prefix${noise}${sign('hello')}`), 'MChiodi');
  // A lone sentinel with no full byte after it decodes to "" (not a crash, not garbage).
  assert.equal(zwDecode(`x${ZW_MARK}${ZW_ZERO}${ZW_ONE}y`), '');
  // Pure noise without a sentinel → "".
  assert.equal(extract(`a${noise}b`), '');
});

test('sign is robust under double application: extract(sign(sign(x))) still recovers "MChiodi"', () => {
  assert.equal(extract(sign(sign('foo'))), 'MChiodi');
  assert.equal(extract(sign(sign(sign('bar')))), 'MChiodi');
});

test('verifySeed rejects a wrong pre-image', () => {
  assert.equal(verifySeed('seed-errada'), false);
  assert.equal(verifySeed(''), false);
  assert.equal(verifySeed(undefined), false);
});

test('verifySeed never throws on empty/null/undefined and returns false', () => {
  for (const bad of ['', null, undefined, 0, {}, []]) {
    assert.equal(verifySeed(bad), false);
  }
});

test('CANARY is exactly 64 lowercase hex chars (a valid sha-256 digest)', () => {
  assert.match(CANARY, /^[0-9a-f]{64}$/);
});

test('whoami: its output, run through extract, recovers "MChiodi"', async () => {
  const r = await run('whoami', {});
  assert.equal(r.ok, true);
  const text = r.lines.join('\n');
  assert.equal(extract(text), 'MChiodi');
  assert.match(text, /Matheus Chiodi \(MChiodi\)/);
});

test('verify: a wrong seed exits with code 1 and reports failure', async () => {
  const bad = await run('verify', { pos: ['definitely-not-the-seed'] });
  assert.equal(bad.ok, false);
  assert.equal(bad.code, 1);
  assert.match(bad.lines.join('\n'), /NÃO comprovada/);
});

test('verify: missing seed is a usage error (code 2)', async () => {
  const r = await run('verify', { pos: [] });
  assert.equal(r.ok, false);
  assert.equal(r.code, 2);
  assert.match(r.lines.join('\n'), /uso: memory verify <seed>/);
});

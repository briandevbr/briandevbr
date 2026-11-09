import test from 'node:test';
import assert from 'node:assert/strict';
import { litBlocks, renderContributions, renderLanguages, renderStack } from '../crt/cards.mjs';

const count = (text, needle) => text.split(needle).length - 1;

test('a stack item over 15 characters is rejected', () => {
  assert.throws(() => renderStack({ now: ['x'.repeat(16)], next: [] }), /stack item too long \(16 > 15\)/);
});

test('the stack card lists now and next', () => {
  const svg = renderStack({ now: ['JavaScript', 'Node.js'], next: ['SQL'] });
  for (const word of ['now/', 'next/', 'JavaScript', 'Node.js', 'SQL', '$ ls ~/stack']) assert.ok(svg.includes(`>${word}</text>`), word);
});

test('language bars scale to the top language', () => {
  assert.equal(litBlocks(28, 28), 20);
  assert.equal(litBlocks(10.8, 28), 8);
  assert.equal(litBlocks(0.1, 28), 1);
});

test('the languages card draws 20 blocks per language', () => {
  const langs = [['Shell', 28.0], ['HTML', 17.6], ['TypeScript', 16.8], ['JavaScript', 15.4], ['PowerShell', 11.4], ['CSS', 10.8]]
    .map(([name, percent]) => ({ name, percent }));
  const svg = renderLanguages(langs);
  assert.ok(svg.includes('>28.0%</text>'));
  assert.ok(svg.includes('>10.8%</text>'));
  assert.equal(count(svg, 'width="10" height="12"'), 120);
});

test('the languages card says so when there is no public code', () => {
  assert.ok(renderLanguages([]).includes('>No public code yet.</text>'));
});

const slices = (c, p, i, o) => [['Commits', c], ['Pull requests', p], ['Issues', i], ['Other', o]].map(([label, value]) => ({ label, value }));

test('the contributions card writes every value and share', () => {
  const svg = renderContributions(slices(151, 3, 0, 8));
  for (const text of ['93.2%', '1.9%', '0.0%', '4.9%', 'TOTAL']) assert.ok(svg.includes(`>${text}</text>`), text);
  assert.match(svg, /aria-label="Contributions by type, last 12 months: Commits 151 \(93\.2%\)/);
});

test('a year without contributions shows an empty ring, not NaN', () => {
  const svg = renderContributions(slices(0, 0, 0, 0));
  assert.ok(svg.includes('>0.0%</text>'));
  assert.ok(!svg.includes('NaN'));
  assert.match(svg, /<circle [^>]*stroke="#0A2416"/);
});

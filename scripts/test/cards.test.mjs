import test from 'node:test';
import assert from 'node:assert/strict';
import { ICONS } from '../crt/icons.mjs';
import { litBlocks, renderContributions, renderKey, renderLanguages, renderShowcase, renderStack, wrapSnake } from '../crt/cards.mjs';

const count = (text, needle) => text.split(needle).length - 1;

const stack = {
  groups: [
    { dir: 'backend', items: ['Node.js', 'Express', 'REST APIs'] },
    { dir: 'web', items: ['JavaScript', 'HTML', 'CSS'] },
  ],
  next: ['SQL', 'TypeScript'],
};

test('a stack item over 15 characters is rejected', () => {
  assert.throws(() => renderStack({ groups: [{ dir: 'x', items: ['x'.repeat(16)] }], next: [] }), /stack item too long \(16 > 15\)/);
});

test('the stack card shows every folder, with next marked as queued', () => {
  const svg = renderStack(stack);
  for (const text of ['backend/', 'web/', 'next/', '# queued', '$ ls -l ~/stack']) assert.ok(svg.includes(`>${text}</text>`), text);
});

test('known tools get their logo next to the name in capitals', () => {
  const svg = renderStack(stack);
  assert.ok(svg.includes('>NODE.JS</text>'));
  assert.ok(svg.includes(`d="${ICONS['Node.js']}"`));
  assert.ok(svg.includes(`d="${ICONS['REST APIs']}"`));
});

test('an item without a logo still gets its chip', () => {
  const svg = renderStack({ groups: [{ dir: 'misc', items: ['Zig'] }], next: [] });
  assert.ok(svg.includes('>ZIG</text>'));
});

test('queued items are dashed', () => {
  assert.ok(renderStack(stack).includes('stroke-dasharray="3 2"'));
});

test('chips wrap to a new row instead of leaving the card', () => {
  const items = ['JavaScript', 'TypeScript', 'Node.js', 'Express', 'REST APIs', 'HTML', 'CSS', 'Git'];
  const svg = renderStack({ groups: [{ dir: 'all', items }], next: [] });
  const chips = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="26"/g)].map((m) => [+m[1], +m[2], +m[3]]);
  assert.equal(chips.length, items.length);
  assert.ok(chips.every(([x, , w]) => x + w <= 471), 'every chip ends inside the card');
  assert.ok(new Set(chips.map(([, y]) => y)).size > 1, 'more than one row');
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

const pizzaria = {
  name: 'Pizzaria3Irmaos',
  site: 'https://briandevbr.github.io/Pizzaria3Irmaos/',
  description: 'Online menu for a pizzeria in Olinda-PE: customers build whole or half-and-half pizzas and send the order straight to WhatsApp.',
  status: 'Local business site',
  languages: ['JavaScript', 'CSS', 'HTML'],
};
const jpeg = Buffer.from([0xff, 0xd8]);

test('a showcase card shows the site in real color under its open command', () => {
  const svg = renderShowcase(pizzaria, jpeg);
  assert.ok(svg.includes('>$ open briandevbr.github.io/Pizzaria3Irmaos</text>'));
  assert.ok(svg.includes('data:image/jpeg;base64,'));
  assert.ok(svg.includes('preserveAspectRatio="xMidYMid slice"'));
  assert.ok(!svg.includes('feColorMatrix'));
});

test('a short name keeps the status on its own row, to the right', () => {
  const svg = renderShowcase(pizzaria, jpeg);
  assert.match(svg, /<text x="[\d.]+" y="314"[^>]*>\[ LOCAL BUSINESS SITE \]<\/text>/);
  assert.match(svg, /<text x="24" y="352"/);
});

test('a long name moves the status to the line below', () => {
  const svg = renderShowcase({ ...pizzaria, name: 'editorial-da-mentira', status: 'Team game · contributor' }, jpeg);
  assert.match(svg, /<text x="24" y="336"[^>]*>\[ TEAM GAME · CONTRIBUTOR \]<\/text>/);
  assert.match(svg, /<text x="24" y="362"/);
  assert.ok(!/<text[^>]*y="314"/.test(svg), 'no text left on the name row');
});

test('a name wider than the card is rejected', () => {
  assert.throws(() => renderShowcase({ ...pizzaria, name: 'x'.repeat(26) }, jpeg), /showcase name too long/);
});

test('showcase text with markup characters stays escaped', () => {
  const svg = renderShowcase({ ...pizzaria, description: 'A & B <C> "D"' }, jpeg);
  assert.ok(svg.includes('A &#38; B &#60;C&#62; &#34;D&#34;'));
  assert.ok(!/&(?![#a-z0-9]+;)/i.test(svg));
});

test('a repo without languages leaves the language line out', () => {
  const svg = renderShowcase({ ...pizzaria, languages: [] }, jpeg);
  assert.ok(!svg.includes(' · </text>'));
  assert.ok(!/<text x="24" y="424"/.test(svg));
});

test('the live site key is lit and the others are not', () => {
  assert.ok(renderKey('site').includes('fill="#39D353"'));
  const email = renderKey('email');
  for (const pattern of [/role="img"/, /<title>[^<]+<\/title>/, /prefers-reduced-motion/]) assert.match(email, pattern);
  assert.throws(() => renderKey('nope'), /Unknown key/);
});

const snk = '<svg viewBox="-16 -32 880 192" width="880" height="192" xmlns="http://www.w3.org/2000/svg"><desc>Generated with https://github.com/Platane/snk</desc><style>:root{--cs:#8cffa8}</style><rect class="c" width="12" height="12"/></svg>';

test('the snake is nested in the frame as markup, so it keeps animating', () => {
  const svg = wrapSnake(snk);
  assert.ok(svg.includes('<svg x="16" y="44" width="880" height="192" viewBox="-16 -32 880 192">'));
  assert.ok(svg.includes(':root{--cs:#8cffa8}'));
  assert.ok(!svg.includes('<image'));
  assert.ok(!svg.includes('<desc>'));
});

test('a snake SVG without viewBox is rejected', () => {
  assert.throws(() => wrapSnake('<svg></svg>'), /without viewBox/);
});

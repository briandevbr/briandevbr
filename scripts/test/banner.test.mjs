import test from 'node:test';
import assert from 'node:assert/strict';
import { bannerPixelSize, renderBanner, renderDivider } from '../crt/banner.mjs';
import { escapeXml } from '../crt/kit.mjs';

const profile = {
  name: 'DAVID BRIAN',
  boot: [
    'Started bash on tty1 (Pop!_OS)',
    'Mounted ~/dotfiles · bash · zsh · PowerShell',
    'Reached target backend.target (Node.js · Express)',
  ],
  role: ['> BACKEND DEVELOPER // NODE.JS · EXPRESS', '> REST APIs & TERMINAL AUTOMATION'],
};

test('the name uses 10 px pixels unless it would not fit', () => {
  assert.equal(bannerPixelSize('DAVID BRIAN'), 10);
  assert.ok(bannerPixelSize('DAVID BRIAN SILVA') < 10);
});

test('the banner prints every boot and role line', () => {
  const svg = renderBanner(profile);
  for (const line of [...profile.boot, ...profile.role]) assert.ok(svg.includes(`>${escapeXml(line)}</text>`), line);
  assert.match(svg, /viewBox="0 0 720 276"/);
  assert.match(svg, /aria-label="David Brian — BACKEND DEVELOPER \/\/ NODE\.JS · EXPRESS · REST APIs &#38; TERMINAL AUTOMATION"/);
});

test('a boot line over 69 characters is rejected', () => {
  assert.throws(() => renderBanner({ ...profile, boot: ['x'.repeat(70)] }), /boot line too long \(70 > 69\)/);
});

test('a role line over 54 characters is rejected', () => {
  assert.throws(() => renderBanner({ ...profile, role: ['x'.repeat(55)] }), /role line too long \(55 > 54\)/);
});

test('the divider is a dashed strip with a running pulse', () => {
  const svg = renderDivider();
  assert.match(svg, /viewBox="0 0 720 14"/);
  assert.match(svg, /stroke-dasharray="8 6"/);
  assert.match(svg, /run 4\.5s/);
  assert.match(svg, /role="img"/);
  assert.match(svg, /<title>Divider<\/title>/);
  assert.match(svg, /prefers-reduced-motion/);
});

test('the cursor is drawn above the typing covers so it can blink', () => {
  const svg = renderBanner(profile);
  const cursor = svg.search(/<rect [^>]*blink 1\.05s/);
  assert.ok(cursor > svg.lastIndexOf('style="animation:t'), 'cursor must come after the last typing cover');
});

test('a fourth boot line is rejected instead of overlapping the name', () => {
  assert.throws(() => renderBanner({ ...profile, boot: [...profile.boot, 'one more'] }), /at most 3 boot lines \(got 4\)/);
});

test('a third role line is rejected instead of being cut off', () => {
  assert.throws(() => renderBanner({ ...profile, role: [...profile.role, '> MORE'] }), /at most 2 role lines \(got 3\)/);
});

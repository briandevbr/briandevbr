import test from 'node:test';
import assert from 'node:assert/strict';
import { GLYPHS, PALETTE, mono, pixelText, screen, snkColorParams, svgDoc, timeline, wrap } from '../crt/kit.mjs';

test('pixelText measures 6 columns per character minus the last gap', () => {
  const name = pixelText('DAVID BRIAN', 0, 0, 10, '#fff');
  assert.equal(name.width, 650);
  assert.equal(name.height, 70);
});

test('pixelText accepts lowercase by drawing it uppercase', () => {
  assert.doesNotThrow(() => pixelText('fatos.online', 0, 0, 3, '#fff'));
});

test('pixelText rejects characters the font does not have', () => {
  assert.throws(() => pixelText('Ã', 0, 0, 3, '#fff'), /Unsupported pixel character: "Ã"/);
});

test('every glyph is 7 rows of 5 columns', () => {
  for (const ch of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.-/:><_ ') {
    const rows = GLYPHS[ch]?.split(' ');
    assert.equal(rows?.length, 7, `glyph ${ch}`);
    assert.ok(rows.every((r) => /^[01]{5}$/.test(r)), `glyph ${ch}`);
  }
});

test('mono pins the text width to 0.6 × size per character', () => {
  assert.match(mono(0, 0, 'abc', 20, '#fff'), /textLength="36\.0"/);
});

test('wrap truncates the last allowed line with an ellipsis', () => {
  assert.deepEqual(wrap('a b c d e f', 3, 2), ['a b', 'c…']);
});

test('screen has two effect levels', () => {
  const args = { width: 100, height: 50, label: 'x', body: '' };
  assert.match(screen({ ...args, level: 'strong' }), /opacity="\.38"/);
  assert.match(screen({ ...args, level: 'light' }), /opacity="\.16"/);
});

test('every document is labelled and honours reduced motion', () => {
  const docs = [
    screen({ width: 100, height: 50, label: 'Card', body: '', level: 'light' }),
    svgDoc({ width: 10, height: 10, label: 'Key', body: '' }),
  ];
  for (const doc of docs) {
    assert.match(doc, /role="img"/);
    assert.match(doc, /<title>[^<]+<\/title>/);
    assert.match(doc, /aria-label="[^"]+"/);
    assert.match(doc, /prefers-reduced-motion: reduce/);
  }
});

test('screen escapes the label', () => {
  assert.match(screen({ width: 1, height: 1, label: 'A & B', body: '', level: 'light' }), /<title>A &#38; B<\/title>/);
});

test('typing cover rests to the right of the text and slides in steps', () => {
  const t = timeline();
  const cover = t.type(10, 50, 6, 16, 0.3);
  assert.match(cover, /x="67\.6"/);
  assert.match(cover, /steps\(6\)/);
  assert.match(cover, new RegExp(`fill="${PALETTE.screen}"`));
  assert.match(t.css.join(''), /translateX\(-57\.6px\)/);
});

test('snake colors match the kit', () => {
  assert.equal(snkColorParams(), 'color_snake=#8cffa8&color_dots=#0a1f12,#0e4429,#006d32,#26a641,#39d353');
});

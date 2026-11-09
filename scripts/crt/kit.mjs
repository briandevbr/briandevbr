// The CRT kit every profile SVG is built from: palette, a 5x7 pixel font,
// fixed-width mono text, the screen frame in two effect levels and the
// helpers that build one-shot animations whose resting state is the final frame.

export const PALETTE = {
  screen: '#04100A', bezel: '#0F3D22', track: '#0A2416', deep: '#0E4429', mid: '#1B7A3C',
  dim: '#4FAE6A', phos: '#39D353', hot: '#8CFFA8', pale: '#D2FFDD',
};

// GitHub's contribution greens, passed to Platane/snk by the workflow.
export const SNAKE = { levels: ['#0a1f12', '#0e4429', '#006d32', '#26a641', '#39d353'], snake: '#8cffa8' };
export const snkColorParams = () => `color_snake=${SNAKE.snake}&color_dots=${SNAKE.levels.join(',')}`;

const MONO_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', monospace";
const CHAR_WIDTH = 0.6;

export const escapeXml = (text) => String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export const textWidth = (chars, size) => chars * CHAR_WIDTH * size;
const sec = (n) => `${+n.toFixed(3)}s`;

// textLength makes every monospace font occupy the same width, so layouts and
// the typing reveal line up whatever font the viewer has.
export const mono = (x, y, text, size, fill, attrs = '') =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" textLength="${textWidth(text.length, size).toFixed(1)}" lengthAdjust="spacingAndGlyphs"${attrs ? ` ${attrs}` : ''}>${escapeXml(text)}</text>`;
export const monoEnd = (xEnd, y, text, size, fill) => mono(+(xEnd - textWidth(text.length, size)).toFixed(1), y, text, size, fill);

export const GLYPHS = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '11111 00100 00100 00100 00100 00100 11111', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 11001 10101 10011 10001 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  '.': '00000 00000 00000 00000 00000 01100 01100', '-': '00000 00000 00000 11111 00000 00000 00000',
  '/': '00001 00010 00010 00100 01000 01000 10000', ':': '00000 01100 01100 00000 01100 01100 00000',
  '>': '01000 00100 00010 00001 00010 00100 01000', '<': '00010 00100 01000 10000 01000 00100 00010',
  _: '00000 00000 00000 00000 00000 00000 11111', ' ': '00000 00000 00000 00000 00000 00000 00000',
};

// Text drawn as squares, so it looks the same on every system.
export function pixelText(text, x, y, p, fill) {
  const gap = p >= 5 ? 1.6 : p >= 3 ? 0.6 : 0.4;
  const chars = [...String(text).toUpperCase()];
  const rects = [];
  chars.forEach((ch, i) => {
    const glyph = GLYPHS[ch];
    if (!glyph) throw new Error(`Unsupported pixel character: "${ch}"`);
    glyph.split(' ').forEach((row, r) => [...row].forEach((on, c) => {
      if (on === '1') rects.push(`<rect x="${+(x + (i * 6 + c) * p).toFixed(2)}" y="${+(y + r * p).toFixed(2)}" width="${+(p - gap).toFixed(2)}" height="${+(p - gap).toFixed(2)}"/>`);
    }));
  });
  return { svg: `<g fill="${fill}">${rects.join('')}</g>`, width: (chars.length * 6 - 1) * p, height: 7 * p };
}

// Greedy word wrap; the last allowed line gets an ellipsis if text is left over.
export function wrap(text, maxChars, maxLines) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  }
  return lines;
}

// One-shot animations. Every animated element rests in its final state and
// the animation starts from the initial one (fill-mode both), so with motion
// turned off the viewer sees the finished screen.
export function timeline() {
  const css = [];
  let n = 0;
  return {
    css,
    show: (start) => `style="animation:show .01s ${sec(start)} both"`,
    fade: (start, dur = 0.6) => `style="animation:fade ${sec(dur)} ease-out ${sec(start)} both"`,
    cursor: (start) => `style="animation:show .01s ${sec(start)} both, blink 1.05s steps(1) ${sec(start)} infinite"`,
    // A screen-colored cover parked to the right of the text that starts over
    // it and slides off one character at a time.
    type(x, y, chars, size, start, perChar = 0.07) {
      const w = textWidth(chars, size);
      const id = `t${n++}`;
      css.push(`@keyframes ${id}{from{transform:translateX(-${w.toFixed(1)}px)}to{transform:translateX(0)}}`);
      return `<rect x="${(x + w).toFixed(1)}" y="${y - size}" width="${(w + 2).toFixed(1)}" height="${+(size * 1.35).toFixed(2)}" fill="${PALETTE.screen}" style="animation:${id} ${sec(chars * perChar)} steps(${chars}) ${sec(start)} both"/>`;
    },
  };
}

const BASE_CSS = '@keyframes show{from{opacity:0}to{opacity:1}}@keyframes fade{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes blink{50%{opacity:0}}';
const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce){*{animation:none!important}}';

// Any profile SVG: labelled for screen readers and still under reduced motion.
export function svgDoc({ width, height, label, body, css = [], defs = '' }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="${MONO_FONT}" role="img" aria-label="${escapeXml(label)}">
<title>${escapeXml(label)}</title>
<style>${BASE_CSS}${css.join('')}${REDUCED_MOTION}</style>
${defs ? `<defs>${defs}</defs>\n` : ''}${body}
</svg>
`;
}

const LEVELS = {
  strong: { radius: 16, scan: '.38', vignette: { r: '75%', from: '.55', to: '.70' } },
  light: { radius: 12, scan: '.16', vignette: { r: '80%', from: '.6', to: '.45' } },
};

// A CRT screen. Strong (the banner) adds the phosphor glow filter `phos`, the
// rolling band and the `flick` keyframes for the body to use.
export function screen({ width, height, label, body, level, css = [], defs = '' }) {
  const lv = LEVELS[level];
  if (!lv) throw new Error(`Unknown screen level: ${level}`);
  const strong = level === 'strong';
  const frameDefs = `<clipPath id="scr"><rect width="${width}" height="${height}" rx="${lv.radius}"/></clipPath>
<pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="${lv.scan}"/></pattern>
<radialGradient id="vig" cx="50%" cy="50%" r="${lv.vignette.r}"><stop offset="${lv.vignette.from}" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${lv.vignette.to}"/></radialGradient>${strong ? `
<filter id="phos" x="-5%" y="-30%" width="110%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<linearGradient id="band" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${PALETTE.phos}" stop-opacity="0"/><stop offset=".5" stop-color="${PALETTE.phos}" stop-opacity=".07"/><stop offset="1" stop-color="${PALETTE.phos}" stop-opacity="0"/></linearGradient>` : ''}${defs ? `\n${defs}` : ''}`;
  const strongCss = strong ? ['@keyframes roll{from{transform:translateY(-80px)}to{transform:translateY(' + (height + 24) + 'px)}}@keyframes flick{0%,96%,100%{opacity:1}97%{opacity:.86}98.5%{opacity:.95}}'] : [];
  const band = strong ? `\n<rect width="${width}" height="80" fill="url(#band)" style="animation:roll 7s linear infinite"/>` : '';
  return svgDoc({
    width, height, label, defs: frameDefs, css: [...strongCss, ...css],
    body: `<g clip-path="url(#scr)">
<rect width="${width}" height="${height}" fill="${PALETTE.screen}"/>
${body}${band}
<rect width="${width}" height="${height}" fill="url(#scan)"/>
<rect width="${width}" height="${height}" fill="url(#vig)"/>
</g>
<rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="${lv.radius - 1}" fill="none" stroke="${PALETTE.bezel}" stroke-width="2"/>`,
  });
}

// The profile banner (a CRT that boots, lights the name in pixels and types
// the role) and the divider strip that separates README sections.
import { PALETTE, mono, pixelText, screen, svgDoc, textWidth, timeline } from './kit.mjs';

export const LIMITS = { boot: 69, role: 54 };
// More lines than this overlap the name (boot) or fall off the screen (role).
export const MAX_LINES = { boot: 3, role: 2 };

const W = 720;
const H = 276;
const X = 32;
const NAME_SPACE = W - 2 * X;

export const bannerPixelSize = (name) => Math.min(10, NAME_SPACE / (6 * name.length - 1));

function check(lines, kind) {
  if (lines.length > MAX_LINES[kind]) throw new Error(`at most ${MAX_LINES[kind]} ${kind} lines (got ${lines.length})`);
  for (const line of lines) {
    if (line.length > LIMITS[kind]) throw new Error(`${kind} line too long (${line.length} > ${LIMITS[kind]}): ${line}`);
  }
}

const titleCase = (name) => name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function renderBanner({ name, boot, role }) {
  check(boot, 'boot');
  check(role, 'role');
  const t = timeline();

  const bootSvg = boot.map((msg, i) => {
    const y = 42 + i * 22;
    const cw = textWidth(1, 14);
    return `<g ${t.show(0.2 + i * 0.35)}>${mono(X, y, '[', 14, PALETTE.dim)}${mono(+(X + cw * 3).toFixed(1), y, 'OK', 14, PALETTE.hot)}${mono(+(X + cw * 7).toFixed(1), y, ']', 14, PALETTE.dim)}${mono(+(X + cw * 9).toFixed(1), y, msg, 14, PALETTE.dim)}</g>`;
  }).join('\n');

  // The name lights up letter by letter as a cover slides off it.
  const p = bannerPixelSize(name);
  const pixels = pixelText(name, X, 104, p, PALETTE.phos);
  const nameAt = 0.2 + boot.length * 0.35 + 0.1;
  t.css.push(`@keyframes nm{from{transform:translateX(-${pixels.width + 4}px)}to{transform:translateX(0)}}`);
  const nameCover = `<rect x="${X + pixels.width + 2}" y="100" width="${pixels.width + 6}" height="${pixels.height + 8}" fill="${PALETTE.screen}" style="animation:nm .9s steps(${name.length}) ${+nameAt.toFixed(3)}s both"/>`;

  const perChar = 0.035;
  let at = nameAt + 1.1;
  const rows = role.map((line, i) => {
    const y = 216 + i * 32;
    const row = { text: mono(X, y, line, 20, PALETTE.hot), cover: t.type(X, y, line.length, 20, at, perChar), end: X + textWidth(line.length, 20), y };
    at += line.length * perChar + 0.2;
    return row;
  });
  const last = rows[rows.length - 1];
  const cursor = last ? `<rect x="${+(last.end + 5).toFixed(1)}" y="${last.y - 16}" width="11" height="19" fill="${PALETTE.hot}" ${t.cursor(at - 0.2)}/>` : '';

  const label = `${titleCase(name)} — ${role.map((l) => l.replace(/^> /, '')).join(' · ')}`;
  return screen({
    width: W, height: H, label, level: 'strong', css: t.css,
    body: `<g filter="url(#phos)" style="animation:flick 6s steps(1) infinite">
${bootSvg}
${pixels.svg}
${rows.map((r) => r.text).join('\n')}
</g>
${nameCover}
${rows.map((r) => r.cover).join('\n')}
<g filter="url(#phos)">${cursor}</g>`,
  });
}

// A thin strip of screen with a dashed trace and a pulse of light running along it.
export function renderDivider() {
  const w = 720;
  const h = 14;
  return svgDoc({
    width: w, height: h, label: 'Divider',
    css: ['@keyframes run{from{transform:translateX(0)}to{transform:translateX(900px)}}'],
    defs: `<linearGradient id="pulse" x1="0" x2="1"><stop offset="0" stop-color="${PALETTE.hot}" stop-opacity="0"/><stop offset=".7" stop-color="${PALETTE.hot}" stop-opacity=".9"/><stop offset="1" stop-color="${PALETTE.hot}" stop-opacity="0"/></linearGradient>
<filter id="g" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="c"><rect width="${w}" height="${h}" rx="4"/></clipPath>`,
    body: `<g clip-path="url(#c)">
<rect width="${w}" height="${h}" fill="${PALETTE.screen}"/>
<line x1="8" x2="${w - 8}" y1="7" y2="7" stroke="${PALETTE.dim}" stroke-width="2" stroke-dasharray="8 6" opacity=".7"/>
<rect x="-180" y="5" width="180" height="4" fill="url(#pulse)" filter="url(#g)" style="animation:run 4.5s cubic-bezier(.45,0,.55,1) infinite"/>
</g>
<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="4" fill="none" stroke="${PALETTE.bezel}"/>`,
  });
}

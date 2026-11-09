// The profile's CRT cards, all drawn on the light screen level and 495 wide
// so they stay legible on a phone.
import { PALETTE, mono, monoEnd, pixelText, screen, textWidth } from './kit.mjs';

const W = 495;
export const STACK_ITEM_MAX = 15;

// Every card opens with its name in pixels and a command on the right.
const titleRow = (title, command) => `${pixelText(title, 24, 22, 3, PALETTE.phos).svg}\n${monoEnd(W - 24, 40, command, 13, PALETTE.dim)}`;

export function renderStack({ now, next }) {
  for (const item of [...now, ...next]) {
    if (item.length > STACK_ITEM_MAX) throw new Error(`stack item too long (${item.length} > ${STACK_ITEM_MAX}): ${item}`);
  }
  const columns = [24, 180, 336];
  const parts = [titleRow('STACK', '$ ls ~/stack')];
  let y = 80;
  for (const [dir, items, color] of [['now/', now, PALETTE.phos], ['next/', next, PALETTE.dim]]) {
    parts.push(mono(24, y, dir, 14, PALETTE.dim));
    y += 26;
    items.forEach((item, i) => {
      const x = columns[i % 3];
      const row = y + Math.floor(i / 3) * 24;
      parts.push(`<rect x="${x}" y="${row - 9}" width="6" height="6" fill="${color}"/>${mono(x + 14, row, item, 15, color)}`);
    });
    y += Math.ceil(items.length / 3) * 24 + 14;
  }
  return screen({ width: W, height: y, level: 'light', label: `Stack. Now: ${now.join(', ')}. Next: ${next.join(', ')}.`, body: parts.join('\n') });
}

const BLOCKS = 20;
export const litBlocks = (percent, max) => Math.max(1, Math.round((percent / max) * BLOCKS));

// One row per language with a bar of blocks, so no language needs a color.
export function renderLanguages(langs) {
  const max = Math.max(...langs.map((l) => l.percent));
  const rows = langs.map((lang, i) => {
    const y = 86 + i * 26;
    const lit = litBlocks(lang.percent, max);
    const blocks = Array.from({ length: BLOCKS }, (_, b) =>
      `<rect x="${158 + b * 13}" y="${y - 11}" width="10" height="12" fill="${b < lit ? PALETTE.phos : PALETTE.track}"/>`).join('');
    return `${mono(24, y, lang.name, 15, PALETTE.phos)}${blocks}${monoEnd(W - 24, y, `${lang.percent.toFixed(1)}%`, 15, PALETTE.hot)}`;
  });
  if (!rows.length) rows.push(mono(24, 86, 'No public code yet.', 15, PALETTE.dim));
  const label = langs.length
    ? `Languages: ${langs.map((l) => `${l.name} ${l.percent.toFixed(1)}%`).join(', ')}`
    : 'Languages: no public code yet';
  return screen({ width: W, height: 86 + rows.length * 26 + 4, level: 'light', label, body: `${titleRow('LANGUAGES', '$ stats --langs')}\n${rows.join('\n')}` });
}

// Donut of the last year's contributions by type. Slices differ by shade and
// a screen-colored gap, and every value is written in the legend.
export function renderContributions(slices) {
  const H = 232, cx = 110, cy = 140, outer = 62, inner = 44;
  const colors = [PALETTE.phos, PALETTE.mid, PALETTE.pale, PALETTE.deep];
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const share = (v) => (total ? (v / total) * 100 : 0).toFixed(1);
  const at = (radius, angle) => `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;

  const visible = slices.map((s, i) => ({ ...s, color: colors[i] })).filter((s) => s.value > 0);
  let ring;
  if (visible.length < 2) {
    // A lone slice, or no data at all, is a full ring; an arc can't draw 360°.
    ring = `<circle cx="${cx}" cy="${cy}" r="${(outer + inner) / 2}" fill="none" stroke="${visible[0]?.color ?? PALETTE.track}" stroke-width="${outer - inner}"/>`;
  } else {
    let angle = -Math.PI / 2;
    ring = visible.map((s) => {
      const end = angle + (s.value / total) * 2 * Math.PI;
      const large = end - angle > Math.PI ? 1 : 0;
      const d = `M${at(outer, angle)} A${outer} ${outer} 0 ${large} 1 ${at(outer, end)} L${at(inner, end)} A${inner} ${inner} 0 ${large} 0 ${at(inner, angle)} Z`;
      angle = end;
      return `<path d="${d}" fill="${s.color}" stroke="${PALETTE.screen}" stroke-width="2.5" stroke-linejoin="round"/>`;
    }).join('');
  }

  const digits = pixelText(String(total), 0, 0, 4, PALETTE.hot);
  const center = pixelText(String(total), cx - digits.width / 2, cy - 22, 4, PALETTE.hot).svg;
  const legend = slices.map((s, i) => {
    const y = 104 + i * 28;
    return `<rect x="214" y="${y - 10}" width="11" height="11" fill="${colors[i]}" stroke="${PALETTE.dim}" stroke-width=".6"/>${mono(234, y, s.label, 15, PALETTE.phos)}${monoEnd(420, y, String(s.value), 15, PALETTE.hot)}${monoEnd(W - 24, y, `${share(s.value)}%`, 15, PALETTE.dim)}`;
  }).join('\n');

  return screen({
    width: W, height: H, level: 'light',
    label: `Contributions by type, last 12 months: ${slices.map((s) => `${s.label} ${s.value} (${share(s.value)}%)`).join(', ')}`,
    body: `${titleRow('CONTRIBUTIONS', 'last 12 months')}
${ring}
${center}
${mono(+(cx - textWidth(5, 11) / 2).toFixed(1), cy + 22, 'TOTAL', 11, PALETTE.dim)}
${legend}
${mono(214, 218, 'Other = new repos, reviews, private', 11, PALETTE.dim)}`,
  });
}

// Generates the "Technology Footprint" and contribution graph cards for the
// profile README. Runs in GitHub Actions and writes light/dark SVGs to dist/,
// which the workflow publishes to the output branch next to the snake.
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const DAYS = 31;
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const THEMES = {
  light: { bg: '#ffffff', text: '#24292f', muted: '#57606a', grid: '#d8dee4', accent: '#2f81f7' },
  dark: { bg: '#0d1117', text: '#c9d1d9', muted: '#8b949e', grid: '#21262d', accent: '#2f81f7' },
};

const QUERY = `query ($login: String!) {
  user(login: $login) {
    name
    login
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
      nodes {
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

async function fetchUser(login, token) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': `${login}-profile-cards`,
    },
    body: JSON.stringify({ query: QUERY, variables: { login } }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`GitHub API error: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data.user;
}

const escapeXml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// Sums language bytes across repos and keeps the top N, with percentages
// relative to those N (same approach as github-readme-stats).
export function topLanguages(repos, limit = 6) {
  const totals = new Map();
  for (const repo of repos) {
    for (const { size, node } of repo.languages.edges) {
      const lang = totals.get(node.name) ?? { name: node.name, color: node.color ?? '#8b949e', size: 0 };
      lang.size += size;
      totals.set(node.name, lang);
    }
  }
  const top = [...totals.values()].sort((a, b) => b.size - a.size).slice(0, limit);
  const total = top.reduce((sum, lang) => sum + lang.size, 0);
  return top.map((lang) => ({ ...lang, percent: (lang.size / total) * 100 }));
}

export function lastDays(calendar, days = DAYS) {
  return calendar.weeks
    .flatMap((week) => week.contributionDays)
    .slice(-days)
    .map((day) => ({ date: day.date, count: day.contributionCount }));
}

// Same 495x195 box as the streak card so both line up side by side.
export function renderLanguagesCard(languages, theme) {
  const t = THEMES[theme];
  const width = 495;
  const height = 195;
  const barX = 25;
  const barWidth = width - 50;

  let x = barX;
  const segments = languages.map((lang, i) => {
    const w = (lang.percent / 100) * barWidth;
    // 2px surface gap between segments, except after the last one.
    const gap = i < languages.length - 1 ? 2 : 0;
    const rect = `<rect x="${x.toFixed(2)}" y="62" width="${Math.max(w - gap, 0).toFixed(2)}" height="8" fill="${lang.color}"/>`;
    x += w;
    return rect;
  });

  const legend = languages.map((lang, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const lx = 25 + col * 225;
    const ly = 108 + row * 28;
    return `<g transform="translate(${lx} ${ly})">
      <circle cx="5" cy="-4" r="5" fill="${lang.color}"/>
      <text x="17" y="0" fill="${t.text}" font-size="13">${escapeXml(lang.name)} <tspan fill="${t.muted}">${lang.percent.toFixed(2)}%</tspan></text>
    </g>`;
  });

  const empty = languages.length === 0
    ? `<text x="25" y="112" fill="${t.muted}" font-size="13">No public code yet.</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img" aria-labelledby="title">
  <title id="title">Technology Footprint: ${languages.map((l) => `${escapeXml(l.name)} ${l.percent.toFixed(1)}%`).join(', ')}</title>
  <rect width="${width}" height="${height}" rx="6" fill="${t.bg}"/>
  <text x="25" y="40" fill="${t.text}" font-size="18" font-weight="600">Technology Footprint</text>
  <clipPath id="bar"><rect x="${barX}" y="62" width="${barWidth}" height="8" rx="4"/></clipPath>
  <rect x="${barX}" y="62" width="${barWidth}" height="8" rx="4" fill="${t.grid}"/>
  <g clip-path="url(#bar)">${segments.join('')}</g>
  ${legend.join('\n  ')}
  ${empty}
</svg>
`;
}

// Single-series line + area of daily contributions for the last DAYS days.
export function renderActivityGraph(days, name, theme) {
  const t = THEMES[theme];
  const width = 850;
  const height = 320;
  const m = { top: 60, right: 25, bottom: 40, left: 45 };
  const plotW = width - m.left - m.right;
  const plotH = height - m.top - m.bottom;

  const max = Math.max(...days.map((d) => d.count), 4);
  const step = Math.ceil(max / 4);
  const yMax = step * 4;

  const xAt = (i) => m.left + (i / Math.max(days.length - 1, 1)) * plotW;
  const yAt = (v) => m.top + plotH - (v / yMax) * plotH;

  const grid = [0, 1, 2, 3, 4].map((i) => {
    const v = i * step;
    const y = yAt(v).toFixed(1);
    return `<line x1="${m.left}" x2="${width - m.right}" y1="${y}" y2="${y}" stroke="${t.grid}" stroke-width="1"/>
    <text x="${m.left - 10}" y="${y}" dy="4" text-anchor="end" fill="${t.muted}" font-size="11">${v}</text>`;
  });

  const xLabels = days.map((d, i) =>
    `<text x="${xAt(i).toFixed(1)}" y="${height - m.bottom + 20}" text-anchor="middle" fill="${t.muted}" font-size="11">${Number(d.date.slice(8))}</text>`);

  const points = days.map((d, i) => `${xAt(i).toFixed(1)},${yAt(d.count).toFixed(1)}`);
  const baseline = yAt(0).toFixed(1);
  const area = `M${xAt(0).toFixed(1)},${baseline} L${points.join(' L')} L${xAt(days.length - 1).toFixed(1)},${baseline} Z`;

  const markers = days.map((d, i) =>
    `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(d.count).toFixed(1)}" r="4" fill="${t.accent}" stroke="${t.bg}" stroke-width="2"><title>${d.date}: ${d.count}</title></circle>`);

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const title = `${escapeXml(name)}'s Contribution Graph`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img" aria-labelledby="title">
  <title id="title">${title}: ${total} contributions in the last ${days.length} days</title>
  <rect width="${width}" height="${height}" rx="6" fill="${t.bg}"/>
  <text x="${width / 2}" y="32" text-anchor="middle" fill="${t.text}" font-size="16" font-weight="600">${title}</text>
  ${grid.join('\n  ')}
  ${xLabels.join('\n  ')}
  <path d="${area}" fill="${t.accent}" fill-opacity="0.15"/>
  <polyline points="${points.join(' ')}" fill="none" stroke="${t.accent}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  ${markers.join('\n  ')}
</svg>
`;
}

async function main() {
  const login = process.env.GITHUB_USER;
  const token = process.env.GITHUB_TOKEN;
  if (!login || !token) throw new Error('GITHUB_USER and GITHUB_TOKEN are required');

  const user = await fetchUser(login, token);
  const languages = topLanguages(user.repositories.nodes);
  const days = lastDays(user.contributionsCollection.contributionCalendar);
  const name = user.name ?? user.login;

  await mkdir('dist', { recursive: true });
  for (const theme of ['light', 'dark']) {
    const suffix = theme === 'dark' ? '-dark' : '';
    await writeFile(`dist/languages${suffix}.svg`, renderLanguagesCard(languages, theme));
    await writeFile(`dist/activity-graph${suffix}.svg`, renderActivityGraph(days, name, theme));
  }
  console.log(`Cards written for ${login}: ${languages.length} languages, ${days.length} days`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

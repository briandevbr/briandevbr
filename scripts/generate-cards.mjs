// Generates the overview, "Technology Footprint", contributions-by-type,
// project and live-site showcase cards for the profile README. Runs in GitHub
// Actions and writes light/dark SVGs to dist/, which the workflow publishes to
// the output branch next to the snake.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

// series: categorical slots for commits, pull requests and issues, checked for
// color-blind separation against each theme's background; other: the gray
// "everything else" slice.
const THEMES = {
  light: {
    bg: '#ffffff', text: '#24292f', muted: '#57606a', grid: '#d8dee4', accent: '#2f81f7', chrome: '#f6f8fa',
    series: ['#2a78d6', '#eb6834', '#1baf7a'], other: '#8c959f',
  },
  dark: {
    bg: '#0d1117', text: '#c9d1d9', muted: '#8b949e', grid: '#30363d', accent: '#2f81f7', chrome: '#161b22',
    series: ['#3987e5', '#d95926', '#199e70'], other: '#6e7681',
  },
};

const QUERY = `query ($login: String!) {
  user(login: $login) {
    name
    login
    createdAt
    followers { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
      totalCount
      nodes {
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      contributionCalendar { totalContributions }
    }
  }
}`;

const REPO_QUERY = `query ($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    description
    url
    languages(first: 3, orderBy: { field: SIZE, direction: DESC }) {
      edges { node { name color } }
    }
  }
}`;

async function graphql(query, variables, token) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'profile-cards',
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`GitHub API error: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body.data;
}

async function fetchUser(login, token) {
  return (await graphql(QUERY, { login }, token)).user;
}

// "repo" in projects.json is either "name" (owned by login) or "owner/name".
async function fetchProject(project, login, token) {
  const [owner, name] = project.repo.includes('/') ? project.repo.split('/') : [login, project.repo];
  const { repository } = await graphql(REPO_QUERY, { owner, name }, token);
  if (!repository) throw new Error(`Repository not found: ${owner}/${name}`);
  return {
    slug: `${owner}-${name}`,
    name: repository.name,
    url: repository.url,
    description: project.description ?? repository.description ?? '',
    status: project.status,
    languages: repository.languages.edges.map(({ node }) => ({ name: node.name, color: node.color ?? '#8b949e' })),
  };
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

// Splits the last year's contributions into commits, pull requests, issues and
// a remainder (new repos, code reviews, private work), so the slices add up to
// the same total the overview strip shows.
export function contributionBreakdown(collection) {
  const total = collection.contributionCalendar.totalContributions;
  const commits = collection.totalCommitContributions;
  const pullRequests = collection.totalPullRequestContributions;
  const issues = collection.totalIssueContributions;
  return [
    { label: 'Commits', value: commits },
    { label: 'Pull requests', value: pullRequests },
    { label: 'Issues', value: issues },
    { label: 'Other', value: Math.max(total - commits - pullRequests - issues, 0) },
  ];
}

// Compact stat strip for the top of the README, styled like the other cards.
export function renderOverview(stats, theme) {
  const t = THEMES[theme];
  const cellWidth = 160;
  const width = cellWidth * stats.length;
  const height = 64;

  const cells = stats.map((stat, i) => {
    const x = i * cellWidth;
    const divider = i > 0
      ? `<line x1="${x}" x2="${x}" y1="14" y2="${height - 14}" stroke="${t.grid}" stroke-width="1"/>`
      : '';
    return `${divider}
    <text x="${x + cellWidth / 2}" y="30" text-anchor="middle" fill="${t.text}" font-size="20" font-weight="600">${escapeXml(stat.value)}</text>
    <text x="${x + cellWidth / 2}" y="49" text-anchor="middle" fill="${t.muted}" font-size="12">${escapeXml(stat.label)}</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img" aria-labelledby="title">
  <title id="title">${stats.map((s) => `${escapeXml(s.label)}: ${escapeXml(s.value)}`).join(', ')}</title>
  <rect width="${width}" height="${height}" rx="6" fill="${t.bg}"/>
  ${cells.join('\n  ')}
</svg>
`;
}

// Greedy word wrap; the last allowed line gets an ellipsis if text is left over.
function wrap(text, maxChars, maxLines) {
  const lines = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
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

export function renderProjectCard(project, theme) {
  const t = THEMES[theme];
  const width = 495;
  const height = 170;

  const status = project.status
    ? (() => {
        const pillWidth = project.status.length * 6.6 + 20;
        const x = width - 25 - pillWidth;
        return `<rect x="${x}" y="24" width="${pillWidth}" height="22" rx="11" fill="none" stroke="${t.grid}"/>
  <text x="${x + pillWidth / 2}" y="39" text-anchor="middle" fill="${t.muted}" font-size="11">${escapeXml(project.status)}</text>`;
      })()
    : '';

  const description = wrap(project.description, 70, 3)
    .map((line, i) => `<text x="25" y="${76 + i * 20}" fill="${t.text}" font-size="13">${escapeXml(line)}</text>`);

  const languages = project.languages.map((lang, i) => `<g transform="translate(${25 + i * 140} 146)">
    <circle cx="5" cy="-4" r="5" fill="${lang.color}"/>
    <text x="17" y="0" fill="${t.muted}" font-size="12">${escapeXml(lang.name)}</text>
  </g>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(project.name)}: ${escapeXml(project.description)}</title>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" fill="${t.bg}" stroke="${t.grid}"/>
  <text x="25" y="41" fill="${t.accent}" font-size="18" font-weight="600">${escapeXml(project.name)}</text>
  ${status}
  ${description.join('\n  ')}
  ${languages.join('\n  ')}
</svg>
`;
}

// Same look as the project card, with the site's screenshot framed as a browser
// window on top. The JPEG is embedded as a data URI because GitHub renders the
// SVG as an image, which can't load anything external.
export function renderShowcaseCard(project, preview, theme) {
  const t = THEMES[theme];
  const width = 495;
  const frame = { x: 16, y: 16, w: 463, bar: 28 };
  const imageH = frame.w / 2;
  const frameH = frame.bar + imageH;
  const nameY = frame.y + frameH + 38;
  const height = nameY + 129;

  const host = project.site.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const pillW = Math.min(host.length * 6.2 + 24, frame.w - 72);
  const dots = [32, 46, 60].map((cx) => `<circle cx="${cx}" cy="${frame.y + 14}" r="4" fill="${t.grid}"/>`);

  const status = project.status
    ? (() => {
        const w = project.status.length * 6.6 + 20;
        const x = width - 25 - w;
        return `<rect x="${x}" y="${nameY - 17}" width="${w}" height="22" rx="11" fill="none" stroke="${t.grid}"/>
  <text x="${x + w / 2}" y="${nameY - 2}" text-anchor="middle" fill="${t.muted}" font-size="11">${escapeXml(project.status)}</text>`;
      })()
    : '';

  const description = wrap(project.description, 70, 3)
    .map((line, i) => `<text x="25" y="${nameY + 35 + i * 20}" fill="${t.text}" font-size="13">${escapeXml(line)}</text>`);

  const languages = project.languages.map((lang, i) => `<g transform="translate(${25 + i * 140} ${nameY + 105})">
    <circle cx="5" cy="-4" r="5" fill="${lang.color}"/>
    <text x="17" y="0" fill="${t.muted}" font-size="12">${escapeXml(lang.name)}</text>
  </g>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img" aria-labelledby="title">
  <title id="title">${escapeXml(project.name)} (live at ${escapeXml(host)}): ${escapeXml(project.description)}</title>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" fill="${t.bg}" stroke="${t.grid}"/>
  <clipPath id="frame"><rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frameH}" rx="6"/></clipPath>
  <g clip-path="url(#frame)">
    <rect x="${frame.x}" y="${frame.y}" width="${frame.w}" height="${frame.bar}" fill="${t.chrome}"/>
    <image href="data:image/jpeg;base64,${preview.toString('base64')}" x="${frame.x}" y="${frame.y + frame.bar}" width="${frame.w}" height="${imageH}" preserveAspectRatio="xMidYMid slice"/>
  </g>
  ${dots.join('\n  ')}
  <rect x="76" y="${frame.y + 5}" width="${pillW}" height="18" rx="9" fill="${t.bg}"/>
  <text x="88" y="${frame.y + 18}" fill="${t.muted}" font-size="11">${escapeXml(host)}</text>
  <line x1="${frame.x}" x2="${frame.x + frame.w}" y1="${frame.y + frame.bar}" y2="${frame.y + frame.bar}" stroke="${t.grid}"/>
  <rect x="${frame.x + 0.5}" y="${frame.y + 0.5}" width="${frame.w - 1}" height="${frameH - 1}" rx="6" fill="none" stroke="${t.grid}"/>
  <text x="25" y="${nameY}" fill="${t.accent}" font-size="18" font-weight="600">${escapeXml(project.name)}</text>
  ${status}
  ${description.join('\n  ')}
  ${languages.join('\n  ')}
</svg>
`;
}

const BUTTONS = {
  // Arrow pointing out of the page.
  site: { label: 'Live site', icon: 'M2 12 L12 2 M5 2 H12 V9', primary: true },
  // Angle brackets.
  repo: { label: 'Source code', icon: 'M5 2 L1 7 L5 12 M9 2 L13 7 L9 12', primary: false },
};

// Pill-shaped link buttons shown under each showcase card.
export function renderButton(kind, theme) {
  const t = THEMES[theme];
  const { label, icon, primary } = BUTTONS[kind];
  const height = 32;
  const width = Math.round(14 + 14 + 8 + label.length * 7.4 + 16);
  const ink = primary ? '#ffffff' : t.text;
  const box = primary
    ? `<rect width="${width}" height="${height}" rx="16" fill="${t.accent}"/>`
    : `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="15.5" fill="${t.bg}" stroke="${t.grid}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img" aria-label="${label}">
  ${box}
  <path d="${icon}" transform="translate(14 9)" fill="none" stroke="${ink}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>
  <text x="36" y="20.5" fill="${ink}" font-size="13" font-weight="600">${label}</text>
</svg>
`;
}

// <picture> that swaps between the light and dark build of an output-branch SVG.
const themedImage = (assetsUrl, file, attrs) => `<picture>
    <source media="(prefers-color-scheme: dark)" srcset="${assetsUrl}/${file}-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="${assetsUrl}/${file}.svg" />
    <img ${attrs} src="${assetsUrl}/${file}.svg" />
  </picture>`;

// HTML for the README block between the projects markers: one card per row,
// each linking to its repo and switching with the viewer's color scheme.
export function renderProjectsSection(projects, assetsUrl) {
  const cards = projects.map((p) =>
    `  <a href="${p.url}">${themedImage(assetsUrl, `project-${p.slug}`, `width="495" alt="${escapeXml(p.name)}: ${escapeXml(p.description)}"`)}</a>`);
  return `<div align="center">\n${cards.join('\n  <br />\n')}\n</div>`;
}

// HTML for the README block between the showcase markers: each live site's
// card (linking to the site) with "Live site" and "Source code" buttons below.
export function renderShowcaseSection(projects, assetsUrl) {
  const blocks = projects.map((p) => `  <a href="${p.site}">${themedImage(assetsUrl, `showcase-${p.slug}`, `width="495" alt="${escapeXml(p.name)}, live site preview: ${escapeXml(p.description)}"`)}</a>
  <br />
  <a href="${p.site}">${themedImage(assetsUrl, 'button-site', `height="32" alt="Open the ${escapeXml(p.name)} live site"`)}</a>
  <a href="${p.url}">${themedImage(assetsUrl, 'button-repo', `height="32" alt="${escapeXml(p.name)} source code on GitHub"`)}</a>`);
  return `<div align="center">\n${blocks.join('\n  <br />\n  <br />\n')}\n</div>`;
}

export function replaceBetweenMarkers(readme, name, content) {
  const start = `<!-- ${name}:start -->`;
  const end = `<!-- ${name}:end -->`;
  const from = readme.indexOf(start);
  const to = readme.indexOf(end);
  if (from === -1 || to === -1) throw new Error(`README is missing the ${name} markers`);
  return `${readme.slice(0, from + start.length)}\n${content}\n${readme.slice(to)}`;
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

// Donut of the last year's contributions by type, in the same 495x195 box as
// the languages card. Slice colors are fixed per type, never by rank, and the
// legend carries every value so color is never the only cue.
export function renderContributionsCard(slices, theme) {
  const t = THEMES[theme];
  const width = 495;
  const height = 195;
  const cx = 100;
  const cy = 115;
  const outer = 60;
  const inner = 44;
  const colors = [...t.series, t.other];
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const percent = (value) => (total ? (value / total) * 100 : 0).toFixed(1);

  const at = (radius, angle) => `${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  const visible = slices.map((s, i) => ({ ...s, color: colors[i] })).filter((s) => s.value > 0);
  let ring;
  if (visible.length < 2) {
    // A lone slice (or no data) is a full ring; arcs can't draw 360 degrees.
    ring = `<circle cx="${cx}" cy="${cy}" r="${(outer + inner) / 2}" fill="none" stroke="${visible[0]?.color ?? t.grid}" stroke-width="${outer - inner}"/>`;
  } else {
    // Clockwise from 12 o'clock; the background-colored stroke is the 2px gap between slices.
    let angle = -Math.PI / 2;
    ring = visible.map((s) => {
      const end = angle + (s.value / total) * 2 * Math.PI;
      const large = end - angle > Math.PI ? 1 : 0;
      const d = `M${at(outer, angle)} A${outer} ${outer} 0 ${large} 1 ${at(outer, end)} L${at(inner, end)} A${inner} ${inner} 0 ${large} 0 ${at(inner, angle)} Z`;
      angle = end;
      return `<path d="${d}" fill="${s.color}" stroke="${t.bg}" stroke-width="2" stroke-linejoin="round"/>`;
    }).join('\n  ');
  }

  const legend = slices.map((s, i) => {
    const y = 78 + i * 24;
    return `<circle cx="195" cy="${y - 4}" r="5" fill="${colors[i]}"/>
  <text x="207" y="${y}" fill="${t.text}" font-size="13">${escapeXml(s.label)}</text>
  <text x="410" y="${y}" text-anchor="end" fill="${t.text}" font-size="13" font-weight="600">${s.value}</text>
  <text x="470" y="${y}" text-anchor="end" fill="${t.muted}" font-size="13">${percent(s.value)}%</text>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="${FONT}" role="img" aria-labelledby="title">
  <title id="title">Contributions by type, last 12 months: ${slices.map((s) => `${escapeXml(s.label)} ${s.value} (${percent(s.value)}%)`).join(', ')}</title>
  <rect width="${width}" height="${height}" rx="6" fill="${t.bg}"/>
  <text x="25" y="40" fill="${t.text}" font-size="18" font-weight="600">Contributions by type</text>
  <text x="470" y="40" text-anchor="end" fill="${t.muted}" font-size="12">Last 12 months</text>
  ${ring}
  <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="${t.text}" font-size="20" font-weight="600">${total}</text>
  <text x="${cx}" y="${cy + 21}" text-anchor="middle" fill="${t.muted}" font-size="11">contributions</text>
  ${legend.join('\n  ')}
  <text x="190" y="180" fill="${t.muted}" font-size="11">Other: new repos, code reviews and private work</text>
</svg>
`;
}

async function main() {
  const login = process.env.GITHUB_USER;
  const token = process.env.GITHUB_TOKEN;
  if (!login || !token) throw new Error('GITHUB_USER and GITHUB_TOKEN are required');

  const user = await fetchUser(login, token);
  const languages = topLanguages(user.repositories.nodes);
  const contributions = contributionBreakdown(user.contributionsCollection);
  const overview = [
    { value: user.contributionsCollection.contributionCalendar.totalContributions, label: 'Contributions (1y)' },
    { value: user.repositories.totalCount, label: 'Public repos' },
    { value: user.followers.totalCount, label: 'Followers' },
    { value: user.createdAt.slice(0, 4), label: 'On GitHub since' },
  ];

  await mkdir('dist', { recursive: true });
  for (const theme of ['light', 'dark']) {
    const suffix = theme === 'dark' ? '-dark' : '';
    await writeFile(`dist/languages${suffix}.svg`, renderLanguagesCard(languages, theme));
    await writeFile(`dist/contributions${suffix}.svg`, renderContributionsCard(contributions, theme));
    await writeFile(`dist/overview${suffix}.svg`, renderOverview(overview, theme));
    for (const kind of Object.keys(BUTTONS)) await writeFile(`dist/button-${kind}${suffix}.svg`, renderButton(kind, theme));
  }
  const projectList = JSON.parse(await readFile('projects.json', 'utf8'));
  const projects = [];
  for (const entry of projectList) projects.push(await fetchProject(entry, login, token));
  for (const project of projects) {
    await writeFile(`dist/project-${project.slug}.svg`, renderProjectCard(project, 'light'));
    await writeFile(`dist/project-${project.slug}-dark.svg`, renderProjectCard(project, 'dark'));
  }

  // showcase.json: projects with a site online; "preview" is a 2:1 screenshot in this repo.
  const showcaseList = JSON.parse(await readFile('showcase.json', 'utf8'));
  const showcase = [];
  for (const entry of showcaseList) showcase.push({ ...(await fetchProject(entry, login, token)), site: entry.site });
  for (const [i, project] of showcase.entries()) {
    const preview = await readFile(showcaseList[i].preview);
    await writeFile(`dist/showcase-${project.slug}.svg`, renderShowcaseCard(project, preview, 'light'));
    await writeFile(`dist/showcase-${project.slug}-dark.svg`, renderShowcaseCard(project, preview, 'dark'));
  }

  const assetsUrl = `https://raw.githubusercontent.com/${process.env.GITHUB_REPOSITORY ?? `${login}/${login}`}/output`;
  let readme = await readFile('README.md', 'utf8');
  readme = replaceBetweenMarkers(readme, 'projects', renderProjectsSection(projects, assetsUrl));
  readme = replaceBetweenMarkers(readme, 'showcase', renderShowcaseSection(showcase, assetsUrl));
  await writeFile('README.md', readme);

  console.log(`Cards written for ${login}: ${languages.length} languages, ${projects.length} projects, ${showcase.length} live sites`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

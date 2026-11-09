// Builds the profile: reads profile.json and showcase.json, fetches the live
// numbers from GitHub, draws every CRT card into dist/ (which the workflow
// publishes to the output branch) and refreshes the README's showcase block.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderBanner, renderDivider } from './crt/banner.mjs';
import { KEYS, renderContributions, renderKey, renderLanguages, renderShowcase, renderStack, wrapSnake } from './crt/cards.mjs';
import { contributionBreakdown, fetchRepo, fetchUser, topLanguages } from './github.mjs';
import { renderShowcaseSection, replaceBetweenMarkers } from './readme.mjs';

export async function main({ cwd = process.cwd(), env = process.env } = {}) {
  const login = env.GITHUB_USER;
  const token = env.GITHUB_TOKEN;
  if (!login || !token) throw new Error('GITHUB_USER and GITHUB_TOKEN are required');
  const at = (...parts) => path.join(cwd, ...parts);

  // Local inputs first, so a missing file fails before any network call.
  const profile = JSON.parse(await readFile(at('profile.json'), 'utf8'));
  const showcaseList = JSON.parse(await readFile(at('showcase.json'), 'utf8'));
  const snakeRaw = at('dist', 'snake-raw.svg');
  const snake = await readFile(snakeRaw, 'utf8').catch(() => {
    throw new Error('Missing dist/snake-raw.svg (run Platane/snk first)');
  });
  const previews = await Promise.all(showcaseList.map((entry) => readFile(at(entry.preview)).catch(() => {
    throw new Error(`Missing preview: ${entry.preview}`);
  })));

  const user = await fetchUser(login, token);
  const projects = [];
  for (const entry of showcaseList) projects.push(await fetchRepo(entry, login, token));

  // Render everything before writing, so a bad input leaves dist/ as it was.
  const files = {
    'banner.svg': renderBanner(profile),
    'divider.svg': renderDivider(),
    'stack.svg': renderStack(profile.stack),
    'languages.svg': renderLanguages(topLanguages(user.repositories.nodes)),
    'contributions.svg': renderContributions(contributionBreakdown(user.contributionsCollection)),
    'snake.svg': wrapSnake(snake),
  };
  for (const kind of Object.keys(KEYS)) files[`key-${kind}.svg`] = renderKey(kind);
  projects.forEach((project, i) => { files[`showcase-${project.slug}.svg`] = renderShowcase(project, previews[i]); });

  await mkdir(at('dist'), { recursive: true });
  for (const [name, svg] of Object.entries(files)) await writeFile(at('dist', name), svg);
  await rm(snakeRaw);

  const assetsUrl = `https://raw.githubusercontent.com/${env.GITHUB_REPOSITORY ?? `${login}/${login}`}/output`;
  const readme = await readFile(at('README.md'), 'utf8');
  await writeFile(at('README.md'), replaceBetweenMarkers(readme, 'showcase', renderShowcaseSection(projects, assetsUrl)));

  console.log(`Profile written for ${login}: ${Object.keys(files).length} SVGs, ${projects.length} live sites`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

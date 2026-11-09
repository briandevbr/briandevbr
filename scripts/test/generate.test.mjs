import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { main } from '../generate-cards.mjs';

const SNAKE = '<svg viewBox="-16 -32 880 192" width="880" height="192" xmlns="http://www.w3.org/2000/svg"><desc>Generated with https://github.com/Platane/snk</desc><style>:root{--cs:#8cffa8}</style><rect width="12" height="12"/></svg>';
const ENV = { GITHUB_USER: 'briandevbr', GITHUB_TOKEN: 't', GITHUB_REPOSITORY: 'briandevbr/briandevbr' };

// Stands in for the GitHub GraphQL API.
globalThis.fetch = async (_url, init) => {
  const { query, variables } = JSON.parse(init.body);
  const data = query.includes('repository(owner')
    ? { repository: { name: variables.name, description: null, url: `https://github.com/${variables.owner}/${variables.name}`, languages: { edges: [{ node: { name: 'HTML' } }] } } }
    : { user: {
      repositories: { nodes: [{ languages: { edges: [{ size: 3, node: { name: 'Shell' } }, { size: 1, node: { name: 'CSS' } }] } }] },
      contributionsCollection: { totalCommitContributions: 151, totalPullRequestContributions: 3, totalIssueContributions: 0, contributionCalendar: { totalContributions: 162 } },
    } };
  return { ok: true, json: async () => ({ data }) };
};

async function fixture() {
  const dir = await mkdtemp(path.join(tmpdir(), 'profile-'));
  await writeFile(path.join(dir, 'profile.json'), await readFile(new URL('../../profile.json', import.meta.url)));
  await writeFile(path.join(dir, 'showcase.json'), JSON.stringify([{
    repo: 'OrganizeMe', site: 'https://briandevbr.github.io/OrganizeMe/', preview: 'assets/showcase/organizeme.jpg',
    description: 'Landing page and sign-up flow.', status: 'College group project',
  }]));
  await mkdir(path.join(dir, 'assets/showcase'), { recursive: true });
  await writeFile(path.join(dir, 'assets/showcase/organizeme.jpg'), Buffer.from([0xff, 0xd8]));
  await writeFile(path.join(dir, 'README.md'), '# x\n<!-- showcase:start -->\n<!-- showcase:end -->\n');
  await mkdir(path.join(dir, 'dist'));
  await writeFile(path.join(dir, 'dist/snake-raw.svg'), SNAKE);
  return dir;
}

test('main writes every card to dist and fills the showcase block', async () => {
  const dir = await fixture();
  await main({ cwd: dir, env: ENV });
  const files = (await readdir(path.join(dir, 'dist'))).sort();
  assert.deepEqual(files, ['banner.svg', 'contributions.svg', 'divider.svg', 'key-email.svg', 'key-linkedin.svg', 'key-repo.svg', 'key-site.svg', 'languages.svg', 'showcase-briandevbr-OrganizeMe.svg', 'snake.svg', 'stack.svg']);
  for (const file of files) {
    const svg = await readFile(path.join(dir, 'dist', file), 'utf8');
    for (const pattern of [/role="img"/, /<title>[^<]+<\/title>/, /prefers-reduced-motion/]) assert.match(svg, pattern, file);
  }
  const readme = await readFile(path.join(dir, 'README.md'), 'utf8');
  assert.ok(readme.includes('https://raw.githubusercontent.com/briandevbr/briandevbr/output/showcase-briandevbr-OrganizeMe.svg'));

  await writeFile(path.join(dir, 'dist/snake-raw.svg'), SNAKE);
  await main({ cwd: dir, env: ENV });
  assert.equal(await readFile(path.join(dir, 'README.md'), 'utf8'), readme);
});

test('a missing preview stops the run and names the file', async () => {
  const dir = await fixture();
  await rm(path.join(dir, 'assets/showcase/organizeme.jpg'));
  await assert.rejects(main({ cwd: dir, env: ENV }), /Missing preview: .*organizeme\.jpg/);
});

test('a missing snake stops the run with a hint', async () => {
  const dir = await fixture();
  await rm(path.join(dir, 'dist/snake-raw.svg'));
  await assert.rejects(main({ cwd: dir, env: ENV }), /Missing dist\/snake-raw\.svg \(run Platane\/snk first\)/);
});

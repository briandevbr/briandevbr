import test from 'node:test';
import assert from 'node:assert/strict';
import { contributionBreakdown, fetchRepo, topLanguages } from '../github.mjs';

const collection = (commits, prs, issues, total) => ({
  totalCommitContributions: commits,
  totalPullRequestContributions: prs,
  totalIssueContributions: issues,
  contributionCalendar: { totalContributions: total },
});

test('the remainder up to the calendar total becomes Other', () => {
  assert.deepEqual(contributionBreakdown(collection(151, 3, 0, 162)), [
    { label: 'Commits', value: 151 },
    { label: 'Pull requests', value: 3 },
    { label: 'Issues', value: 0 },
    { label: 'Other', value: 8 },
  ]);
});

test('Other is never negative', () => {
  assert.equal(contributionBreakdown(collection(150, 4, 0, 150))[3].value, 0);
});

const repo = (...langs) => ({ languages: { edges: langs.map(([name, size]) => ({ size, node: { name, color: '#000' } })) } });

test('top languages sum to 100% in descending order', () => {
  const langs = topLanguages([
    repo(['Shell', 700], ['HTML', 200], ['CSS', 90]),
    repo(['TypeScript', 400], ['JavaScript', 300], ['PowerShell', 250], ['Python', 10], ['HTML', 100]),
  ]);
  assert.ok(langs.length <= 6);
  assert.deepEqual(langs.map((l) => l.name), ['Shell', 'TypeScript', 'HTML', 'JavaScript', 'PowerShell', 'CSS']);
  assert.ok(Math.abs(langs.reduce((s, l) => s + l.percent, 0) - 100) < 0.01);
});

function stubFetch(repository) {
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    calls.push(JSON.parse(init.body).variables);
    return { ok: true, json: async () => ({ data: { repository } }) };
  };
  return calls;
}

test('fetchRepo builds the slug and keeps up to 3 language names', async () => {
  stubFetch({ name: 'fatos.online', description: null, url: 'https://github.com/briandevbr/fatos.online', languages: { edges: [{ node: { name: 'TypeScript' } }, { node: { name: 'HTML' } }, { node: { name: 'CSS' } }] } });
  const r = await fetchRepo({ repo: 'fatos.online', site: 'https://briandevbr.github.io/fatos.online/', status: 'College group project', description: 'Fact-checking' }, 'briandevbr', 't');
  assert.equal(r.slug, 'briandevbr-fatos.online');
  assert.deepEqual(r.languages, ['TypeScript', 'HTML', 'CSS']);
  assert.equal(r.site, 'https://briandevbr.github.io/fatos.online/');
  assert.equal(r.description, 'Fact-checking');
});

test('fetchRepo reads owner/name entries', async () => {
  const calls = stubFetch({ name: 'x', description: 'from repo', url: 'u', languages: { edges: [] } });
  const r = await fetchRepo({ repo: 'owner/x', site: 's', status: 'st' }, 'briandevbr', 't');
  assert.deepEqual(calls[0], { owner: 'owner', name: 'x' });
  assert.equal(r.description, 'from repo');
});

test('fetchRepo fails clearly for a missing repository', async () => {
  stubFetch(null);
  await assert.rejects(fetchRepo({ repo: 'nope', site: 's', status: 'st' }, 'briandevbr', 't'), /Repository not found: briandevbr\/nope/);
});

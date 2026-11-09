// GitHub GraphQL queries and the shaping of their results into card data.

const USER_QUERY = `query ($login: String!) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) {
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
      edges { node { name } }
    }
  }
}`;

export async function graphql(query, variables, token) {
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

export async function fetchUser(login, token) {
  return (await graphql(USER_QUERY, { login }, token)).user;
}

// "repo" in showcase.json is either "name" (owned by login) or "owner/name".
export async function fetchRepo(entry, login, token) {
  const [owner, name] = entry.repo.includes('/') ? entry.repo.split('/') : [login, entry.repo];
  const { repository } = await graphql(REPO_QUERY, { owner, name }, token);
  if (!repository) throw new Error(`Repository not found: ${owner}/${name}`);
  return {
    slug: `${owner}-${name}`,
    name: repository.name,
    url: repository.url,
    description: entry.description ?? repository.description ?? '',
    status: entry.status,
    site: entry.site,
    languages: repository.languages.edges.map(({ node }) => node.name),
  };
}

// Sums language bytes across repos and keeps the top N, with percentages
// relative to those N (same approach as github-readme-stats).
export function topLanguages(repos, limit = 6) {
  const totals = new Map();
  for (const repo of repos) {
    for (const { size, node } of repo.languages.edges) {
      const lang = totals.get(node.name) ?? { name: node.name, size: 0 };
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
// the calendar total.
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

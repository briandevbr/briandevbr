// The README block the workflow owns: the live-projects section between the
// showcase markers. Everything else in the README is edited by hand.
import { escapeXml } from './crt/kit.mjs';

// One centered card per live site, linking to the site, with the LIVE SITE
// and SOURCE keys below it.
export function renderShowcaseSection(projects, assetsUrl) {
  const blocks = projects.map((p) => {
    const name = escapeXml(p.name);
    return `  <a href="${p.site}"><img src="${assetsUrl}/showcase-${p.slug}.svg" width="495" alt="${name}, live site preview: ${escapeXml(p.description)}" /></a>
  <br />
  <a href="${p.site}"><img src="${assetsUrl}/key-site.svg" height="40" alt="Open the ${name} live site" /></a>
  <a href="${p.url}"><img src="${assetsUrl}/key-repo.svg" height="40" alt="${name} source code on GitHub" /></a>`;
  });
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

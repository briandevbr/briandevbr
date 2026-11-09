import test from 'node:test';
import assert from 'node:assert/strict';
import { renderShowcaseSection, replaceBetweenMarkers } from '../readme.mjs';

const ASSETS = 'https://raw.githubusercontent.com/briandevbr/briandevbr/output';
const organizeMe = {
  slug: 'briandevbr-OrganizeMe',
  name: 'OrganizeMe',
  url: 'https://github.com/briandevbr/OrganizeMe',
  site: 'https://briandevbr.github.io/OrganizeMe/',
  description: 'Landing page & sign-up flow.',
};

test('each live site gets its card and the two keys', () => {
  assert.equal(renderShowcaseSection([organizeMe], ASSETS), `<div align="center">
  <a href="https://briandevbr.github.io/OrganizeMe/"><img src="${ASSETS}/showcase-briandevbr-OrganizeMe.svg" width="495" alt="OrganizeMe, live site preview: Landing page &#38; sign-up flow." /></a>
  <br />
  <a href="https://briandevbr.github.io/OrganizeMe/"><img src="${ASSETS}/key-site.svg" height="40" alt="Open the OrganizeMe live site" /></a>
  <a href="https://github.com/briandevbr/OrganizeMe"><img src="${ASSETS}/key-repo.svg" height="40" alt="OrganizeMe source code on GitHub" /></a>
</div>`);
});

test('sites are separated by a blank line of breaks', () => {
  const block = renderShowcaseSection([organizeMe, { ...organizeMe, slug: 'b-x', name: 'x' }], ASSETS);
  assert.ok(block.includes('source code on GitHub" /></a>\n  <br />\n  <br />\n  <a href='));
});

test('replacing the block twice gives the same README', () => {
  const readme = 'top\n<!-- showcase:start -->\nold\n<!-- showcase:end -->\nbottom\n';
  const once = replaceBetweenMarkers(readme, 'showcase', 'new');
  assert.equal(replaceBetweenMarkers(once, 'showcase', 'new'), once);
  assert.equal(once, 'top\n<!-- showcase:start -->\nnew\n<!-- showcase:end -->\nbottom\n');
});

test('a README without the markers is rejected', () => {
  assert.throws(() => replaceBetweenMarkers('no markers', 'showcase', 'x'), /missing the showcase markers/);
});

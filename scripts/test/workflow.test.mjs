import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { snkColorParams } from '../crt/kit.mjs';

const workflow = await readFile(new URL('../../.github/workflows/snake.yml', import.meta.url), 'utf8');

test('the snake is generated in the kit colors', () => {
  assert.ok(workflow.includes(`dist/snake-raw.svg?${snkColorParams()}`));
});

test('steps run tests, snake, cards, validation and publish in that order', () => {
  const order = ['node --test', 'Platane/snk', 'generate-cards.mjs', 'xml.etree', 'ghaction-github-pages'].map((step) => workflow.indexOf(step));
  assert.ok(order.every((i) => i >= 0), `missing step: ${order}`);
  assert.deepEqual([...order].sort((a, b) => a - b), order);
});

test('no commit is made as the Actions bot', () => {
  assert.ok(!workflow.includes('github-actions[bot]'));
});

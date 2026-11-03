import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertReady, parseContent } from '../src/content/model.ts';

const full = JSON.parse(readFileSync(new URL('../content/advent.json', import.meta.url), 'utf8'));
const prototype = JSON.parse(readFileSync(new URL('../content/prototype.json', import.meta.url), 'utf8'));

test('the prototype is separate from the 15 unassigned authoring drafts', () => {
  assert.equal(parseContent(prototype).letterCount, 1);
  const content = parseContent(full);
  assert.equal(content.letterCount, 15);
  assert(content.letters.every((letter) => letter.packageNumber === null && letter.giftId === null));
  assert.throws(() => assertReady(content));
  assert.throws(() => assertReady(parseContent(prototype)));
});

test('duplicate IDs and malformed text are rejected', () => {
  const duplicate = structuredClone(full);
  duplicate.letters[1].id = duplicate.letters[0].id;
  assert.throws(() => parseContent(duplicate));
  const malformed = structuredClone(prototype);
  malformed.letters[0].paragraphs = '<p>HTML instead of an array</p>';
  assert.throws(() => parseContent(malformed));
});

test('a completed calendar requires unique gift and package assignments', () => {
  const ready = parseContent(structuredClone(full));
  ready.letters.forEach((letter, index) => Object.assign(letter, {
    contentStatus: 'ready', envelopeTitle: 'Заголовок', salutation: 'Даша,', paragraphs: ['Тестовый текст.'],
    signature: ['Подпись'], giftId: `gift-${index + 1}`, packageNumber: index + 1,
  }));
  assert.doesNotThrow(() => assertReady(ready));
  ready.letters[1].packageNumber = 1;
  assert.throws(() => assertReady(ready));
  ready.letters[1].packageNumber = 2;
  ready.letters[1].giftId = ready.letters[0].giftId;
  assert.throws(() => assertReady(ready));
});

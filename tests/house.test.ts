import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { HOUSE } from '../src/scenes/house.ts';
import { parseContent } from '../src/content/model.ts';
import { createProgress, foundCount, isComplete, progressReducer } from '../src/state/progress.ts';
import { parseProgress, restoreProgress, saveProgress, STORAGE_KEY, type StorageLike } from '../src/state/storage.ts';

const content = parseContent(JSON.parse(readFileSync(new URL('../content/advent.json', import.meta.url), 'utf8')));
const ids = content.letters.map((letter) => letter.id);
const at = '2026-11-04T12:00:00.000Z';

test('three rooms cover every content ID exactly once; each has five reachable places', () => {
  assert.equal(HOUSE.length, 3);
  const places = HOUSE.flatMap((scene) => scene.places);
  assert.deepEqual(places.map((place) => place.letterId).sort(), [...ids].sort());
  for (const scene of HOUSE) {
    assert.equal(scene.places.length, 5);
    for (const place of scene.places) {
      assert(place.x - place.width / 2 >= 0 && place.x + place.width / 2 <= 100);
      assert(place.y >= 25 && place.y <= 70);
      assert(place.label && place.hint);
    }
  }
});

test('a partial search restores the room, moved objects and finds without unlocking letters', () => {
  let state = createProgress(ids);
  state = progressReducer(state, { type: 'intro' });
  state = progressReducer(state, { type: 'scene', sceneId: 'tree' });
  state = progressReducer(state, { type: 'reveal', letterId: 'letter-06' });
  state = progressReducer(state, { type: 'find', letterId: 'letter-06', at });
  state = progressReducer(state, { type: 'reveal', letterId: 'letter-07' });
  let raw = '';
  const storage: StorageLike = { getItem: () => raw, setItem: (_, value) => { raw = value; }, removeItem: () => {} };
  assert(saveProgress(state, storage));
  const restored = restoreProgress(ids, storage);
  assert.equal(restored.status, 'ok');
  assert.deepEqual(restored.progress, state);
  assert.equal(restored.progress.currentScene, 'tree');
  assert.equal(foundCount(restored.progress), 1);
  assert.equal(isComplete(restored.progress), false);
  assert.equal(progressReducer(restored.progress, { type: 'open', letterId: 'letter-06', at }), restored.progress);
});

test('15 finds unlock every letter, while the old one-letter save stays separate', () => {
  let state = createProgress(ids);
  for (const scene of HOUSE) for (const place of scene.places) {
    state = progressReducer(state, { type: 'reveal', letterId: place.letterId });
    state = progressReducer(state, { type: 'find', letterId: place.letterId, at });
  }
  assert.equal(foundCount(state), 15);
  assert(isComplete(state));
  for (const id of ids) state = progressReducer(state, { type: 'open', letterId: id, at });
  assert(ids.every((id) => state.letters[id].openedAt === at));
  assert(ids.every((id) => state.letters[id].unwrappedAt === null));
  assert.deepEqual(parseProgress(JSON.stringify(state), ids), state);
  assert.notEqual(STORAGE_KEY, 'dasha-winter:prototype-one-letter:v1');
});

test('invalid rooms and foreign or incomplete saves are rejected', () => {
  const invalid = { ...createProgress(ids), currentScene: 'outside' };
  assert.throws(() => parseProgress(JSON.stringify(invalid), ids));
  assert.throws(() => parseProgress(JSON.stringify(createProgress(['letter-01'])), ids));
});

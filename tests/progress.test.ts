import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createProgress, foundCount, isComplete, progressReducer, type Progress } from '../src/state/progress.ts';
import { parseProgress, restoreProgress, saveProgress, type StorageLike } from '../src/state/storage.ts';

const at = '2026-11-03T16:00:00.000Z';
function find(state: Progress, letterId: string) {
  return progressReducer(progressReducer(state, { type: 'reveal', letterId }), { type: 'find', letterId, at });
}

test('a concealed letter cannot be collected; repeated finds never increase the count', () => {
  const initial = createProgress(['letter-01']);
  assert.deepEqual(progressReducer(initial, { type: 'find', letterId: 'letter-01', at }), initial);
  const found = find(initial, 'letter-01');
  assert.equal(foundCount(found), 1);
  assert.equal(progressReducer(found, { type: 'find', letterId: 'letter-01', at: '2026-11-04T12:00:00Z' }), found);
  assert.equal(found.letters['letter-01'].openedAt, null);
});

test('all letters are required to open any letter, including a found one', () => {
  let state = createProgress(Array.from({ length: 15 }, (_, i) => `letter-${String(i + 1).padStart(2, '0')}`));
  for (let i = 1; i < 15; i++) state = find(state, `letter-${String(i).padStart(2, '0')}`);
  assert.equal(foundCount(state), 14);
  assert.equal(isComplete(state), false);
  assert.equal(progressReducer(state, { type: 'open', letterId: 'letter-01', at }), state);
  state = find(state, 'letter-15');
  assert.equal(isComplete(state), true);
  assert.equal(progressReducer(state, { type: 'open', letterId: 'letter-01', at }).letters['letter-01'].openedAt, at);
});

test('reading and unwrapping are independent, persistent and reversible', () => {
  let state = find(createProgress(['letter-01']), 'letter-01');
  assert.equal(progressReducer(state, { type: 'unwrap', letterId: 'letter-01', at }), state);
  state = progressReducer(state, { type: 'open', letterId: 'letter-01', at });
  assert.equal(state.letters['letter-01'].unwrappedAt, null);
  state = progressReducer(state, { type: 'unwrap', letterId: 'letter-01', at });
  const restored = parseProgress(JSON.stringify(state), ['letter-01']);
  assert.equal(restored.letters['letter-01'].unwrappedAt, at);
  const undone = progressReducer(restored, { type: 'undo-unwrap', letterId: 'letter-01' });
  assert.equal(undone.letters['letter-01'].unwrappedAt, null);
  assert.equal(undone.letters['letter-01'].openedAt, at);
  assert.equal(foundCount(undone), 1);
});

test('unknown IDs do not affect progress; reset only resets this game state', () => {
  const state = find(createProgress(['letter-01']), 'letter-01');
  assert.equal(progressReducer(state, { type: 'reveal', letterId: '__proto__' }), state);
  assert.deepEqual(progressReducer(state, { type: 'reset' }), createProgress(['letter-01']));
});

test('corrupt saves are preserved for recovery, not silently replaced', () => {
  let stored = '{broken save';
  const storage: StorageLike = { getItem: () => stored, setItem: (_, value) => { stored = value; }, removeItem: () => {} };
  const restored = restoreProgress(['letter-01'], storage);
  assert.equal(restored.status, 'invalid');
  assert.equal(restored.raw, stored);
  assert.equal(stored, '{broken save');
});

test('unavailable and full storage are handled without throwing', () => {
  const storage: StorageLike = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); }, removeItem: () => {} };
  assert.equal(restoreProgress(['letter-01'], storage).status, 'unavailable');
  assert.equal(saveProgress(createProgress(['letter-01']), storage), false);
  assert.equal(saveProgress(createProgress(['letter-01']), null), false);
});

test('a save cannot claim unwrapping without opening or opening before all finds', () => {
  const illegal = createProgress(['letter-01']);
  illegal.letters['letter-01'].unwrappedAt = at;
  assert.throws(() => parseProgress(JSON.stringify(illegal), ['letter-01']));
  const incomplete = find(createProgress(['letter-01', 'letter-02']), 'letter-01');
  incomplete.letters['letter-01'].openedAt = at;
  assert.throws(() => parseProgress(JSON.stringify(incomplete), ['letter-01', 'letter-02']));
});

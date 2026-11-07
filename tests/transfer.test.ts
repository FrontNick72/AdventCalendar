import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { createProgress, progressReducer } from '../src/state/progress';
import { parseProgress } from '../src/state/storage';
import { exportProgress, importProgress, MAX_BACKUP_BYTES } from '../src/state/transfer';

const ids = Array.from({ length: 14 }, (_, i) => `letter-${String(i + 1).padStart(2, '0')}`);
const at = '2026-11-04T12:00:00.000Z';

test('backup roundtrip preserves room, revealed-but-uncollected objects and independent events', () => {
  let progress = createProgress(ids);
  progress = progressReducer(progress, { type: 'intro' });
  progress = progressReducer(progress, { type: 'scene', sceneId: 'tree' });
  for (const id of ids) {
    progress = progressReducer(progress, { type: 'reveal', letterId: id });
    if (id !== ids[13]) progress = progressReducer(progress, { type: 'find', letterId: id, at });
  }
  assert.deepEqual(importProgress(`\uFEFF${exportProgress(progress)}`, ids).progress, progress);
  progress = progressReducer(progress, { type: 'find', letterId: ids[13], at });
  progress = progressReducer(progress, { type: 'open', letterId: ids[0], at });
  progress = progressReducer(progress, { type: 'unwrap', letterId: ids[0], at });
  progress = progressReducer(progress, { type: 'open', letterId: ids[1], at });
  const restored = importProgress(exportProgress(progress), ids).progress;
  assert.deepEqual(restored, progress);
  assert.equal(restored.letters[ids[1]].unwrappedAt, null);
});

test('invalid, unrelated, oversized and incompatible backups are rejected without modifying current progress', () => {
  const current = createProgress(ids);
  const before = structuredClone(current);
  const valid = JSON.parse(exportProgress(current));
  const cases = [
    '{broken', JSON.stringify(current), JSON.stringify({ ...valid, format: 'other-game' }),
    JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, exportedAt: 'not a date' }),
    JSON.stringify({ ...valid, progress: { ...current, schemaVersion: 999 } }),
    JSON.stringify({ ...valid, progress: { ...current, revealedIds: [ids[0], ids[0]] } }),
    JSON.stringify({ ...valid, progress: { ...current, revealedIds: ['other-letter'] } }),
    JSON.stringify({ ...valid, progress: { ...current, currentScene: 'attic' } }),
    JSON.stringify({ ...valid, progress: { ...current, letters: {} } }),
    'я'.repeat(MAX_BACKUP_BYTES / 2 + 1),
  ];
  for (const raw of cases) assert.throws(() => importProgress(raw, ids));
  assert.deepEqual(current, before);
});

test('unwrapping without opening and opening before the 14th find cannot be imported', () => {
  const progress = createProgress(ids);
  progress.letters[ids[0]].unwrappedAt = at;
  assert.throws(() => importProgress(exportProgress(progress), ids));
  progress.letters[ids[0]] = { foundAt: at, openedAt: at, unwrappedAt: null };
  progress.revealedIds = [ids[0]];
  assert.throws(() => importProgress(exportProgress(progress), ids));
});

test('malformed and impossible timestamps are rejected, unknown fields never enter restored state', () => {
  let progress = createProgress(ids);
  progress = progressReducer(progress, { type: 'reveal', letterId: ids[0] });
  progress = progressReducer(progress, { type: 'find', letterId: ids[0], at });
  for (const bad of ['1', '2026-02-30T12:00:00Z', '2026-11-04T99:00:00Z', 42]) {
    const edited = structuredClone(progress) as unknown as { letters: Record<string, { foundAt: unknown }> };
    edited.letters[ids[0]].foundAt = bad;
    assert.throws(() => parseProgress(JSON.stringify(edited), ids));
  }
  const raw = JSON.stringify(progress).replace('"schemaVersion":2', '"__proto__":{"polluted":true},"extra":"ignored","schemaVersion":2');
  const restored = parseProgress(raw, ids);
  assert.deepEqual(restored, progress);
  assert.equal(Object.hasOwn(restored, '__proto__'), false);
});

test('a corrected device clock cannot invalidate an otherwise consistent archive', () => {
  let progress = createProgress(['letter-01']);
  progress = progressReducer(progress, { type: 'reveal', letterId: 'letter-01' });
  progress = progressReducer(progress, { type: 'find', letterId: 'letter-01', at });
  progress = progressReducer(progress, { type: 'open', letterId: 'letter-01', at: '2026-11-04T10:00:00.000Z' });
  assert.deepEqual(importProgress(exportProgress(progress), ['letter-01']).progress, progress);
});

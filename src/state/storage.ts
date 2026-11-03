import { createProgress, type Progress } from './progress';

// A separate key protects the future 15-letter calendar from demo progress.
export const STORAGE_KEY = 'dasha-winter:prototype-one-letter:v1';
export type StorageStatus = 'ok' | 'unavailable' | 'invalid';
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function timestamp(value: unknown): value is string | null {
  return value === null || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

export function parseProgress(raw: string, ids: string[]): Progress {
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.schemaVersion !== 1 || typeof value.introSeen !== 'boolean' ||
      !Array.isArray(value.revealedIds) || !value.revealedIds.every((id) => typeof id === 'string' && ids.includes(id)) ||
      new Set(value.revealedIds).size !== value.revealedIds.length || !record(value.letters) ||
      Object.keys(value.letters).length !== ids.length) throw new Error('Неверный формат сохранения.');

  for (const id of ids) {
    const letter = value.letters[id];
    if (!record(letter) || !timestamp(letter.foundAt) || !timestamp(letter.openedAt) || !timestamp(letter.unwrappedAt) ||
        (letter.foundAt !== null && !value.revealedIds.includes(id)) ||
        (letter.openedAt !== null && letter.foundAt === null) ||
        (letter.unwrappedAt !== null && letter.openedAt === null)) throw new Error('Нарушена последовательность событий.');
  }
  const result = value as unknown as Progress;
  if (Object.values(result.letters).some((letter) => letter.openedAt) &&
      !Object.values(result.letters).every((letter) => letter.foundAt)) throw new Error('Письмо открыто до завершения поиска.');
  return result;
}

export function restoreProgress(ids: string[], storage: StorageLike | null): { progress: Progress; status: StorageStatus; raw: string | null } {
  const fallback = createProgress(ids);
  if (!storage) return { progress: fallback, status: 'unavailable', raw: null };
  let raw: string | null;
  try { raw = storage.getItem(STORAGE_KEY); }
  catch { return { progress: fallback, status: 'unavailable', raw: null }; }
  if (raw === null) return { progress: fallback, status: 'ok', raw: null };
  try { return { progress: parseProgress(raw, ids), status: 'ok', raw }; }
  catch { return { progress: fallback, status: 'invalid', raw }; }
}

export function saveProgress(progress: Progress, storage: StorageLike | null): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch { return false; }
}

import { createProgress, type Progress } from './progress';
import { isSceneId } from '../scenes/house';

// Never read or overwrite the old one-letter demo save.
export const STORAGE_KEY = 'dasha-winter:house-15:v2';
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
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const normalized = value.replace(/(?:\.(\d{1,3}))?Z$/, (_, fraction: string | undefined) => `.${(fraction ?? '').padEnd(3, '0')}Z`);
  return new Date(value).toISOString() === normalized;
}

export function parseProgress(raw: string, ids: string[]): Progress {
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.schemaVersion !== 2 || !isSceneId(value.currentScene) || typeof value.introSeen !== 'boolean' ||
      !Array.isArray(value.revealedIds) || !value.revealedIds.every((id) => typeof id === 'string' && ids.includes(id)) ||
      new Set(value.revealedIds).size !== value.revealedIds.length || !record(value.letters) ||
      Object.keys(value.letters).length !== ids.length) throw new Error('Неверный формат сохранения.');

  const result = createProgress(ids);
  result.currentScene = value.currentScene;
  result.introSeen = value.introSeen;
  result.revealedIds = [...value.revealedIds] as string[];
  for (const id of ids) {
    const letter = value.letters[id];
    if (!record(letter) || !timestamp(letter.foundAt) || !timestamp(letter.openedAt) || !timestamp(letter.unwrappedAt) ||
        (letter.foundAt !== null && !value.revealedIds.includes(id)) ||
        (letter.openedAt !== null && letter.foundAt === null) ||
        (letter.unwrappedAt !== null && letter.openedAt === null)) throw new Error('Нарушена последовательность событий.');
    // Event presence defines the sequence; a device's clock can change between visits.
    result.letters[id] = { foundAt: letter.foundAt, openedAt: letter.openedAt, unwrappedAt: letter.unwrappedAt };
  }
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

import type { Progress } from './progress';
import { parseProgress } from './storage';

export const MAX_BACKUP_BYTES = 128 * 1024;
const FORMAT = 'dasha-winter-progress';

export interface ProgressBackup {
  format: typeof FORMAT;
  version: 1;
  exportedAt: string;
  progress: Progress;
}

export function exportProgress(progress: Progress): string {
  return JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), progress }, null, 2);
}

export function importProgress(raw: string, ids: string[]): ProgressBackup {
  if (new TextEncoder().encode(raw).byteLength > MAX_BACKUP_BYTES) throw new Error('Файл слишком большой. Выбери сохранение размером до 128 КБ.');
  let value: unknown;
  try { value = JSON.parse(raw.replace(/^\uFEFF/, '')); }
  catch { throw new Error('Не удалось прочитать файл. Выбери JSON, сохранённый через «Сохранить прогресс в файл».'); }
  if (typeof value !== 'object' || value === null || Array.isArray(value) ||
      !('format' in value) || value.format !== FORMAT || !('version' in value) || value.version !== 1 ||
      !('exportedAt' in value) || typeof value.exportedAt !== 'string' ||
      !Number.isFinite(Date.parse(value.exportedAt)) || new Date(value.exportedAt).toISOString() !== value.exportedAt || !('progress' in value)) {
    throw new Error('Этот файл не подходит. Нужна копия прогресса из нашего зимнего дома.');
  }
  try {
    return { format: FORMAT, version: 1, exportedAt: value.exportedAt, progress: parseProgress(JSON.stringify(value.progress), ids) };
  } catch {
    throw new Error('Сохранение повреждено или относится к другой версии дома. Текущий прогресс не изменён.');
  }
}

export function downloadJson(raw: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari may still be handing the file to Downloads after the click returns.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

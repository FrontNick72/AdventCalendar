import { test, expect, devices, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createProgress, progressReducer, type Progress } from '../../src/state/progress';
import { STORAGE_KEY } from '../../src/state/storage';
import { exportProgress, MAX_BACKUP_BYTES } from '../../src/state/transfer';
import { HOUSE } from '../../src/scenes/house';

const ids = HOUSE.flatMap((scene) => scene.places.map((place) => place.letterId)).sort();
const at = '2026-11-04T12:00:00.000Z';

function fixture(count: number): Progress {
  let progress = progressReducer(createProgress(ids), { type: 'intro' });
  progress = progressReducer(progress, { type: 'scene', sceneId: 'tree' });
  for (const id of ids.slice(0, count)) {
    progress = progressReducer(progress, { type: 'reveal', letterId: id });
    progress = progressReducer(progress, { type: 'find', letterId: id, at });
  }
  return progress;
}

async function choose(page: Page, contents: string, name = 'winter-progress.json') {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Восстановить из файла', exact: true }).tap();
  await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(contents) });
}

async function seed(page: Page, progress: Progress) {
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key: STORAGE_KEY, raw: JSON.stringify(progress) });
}

test('iPhone: downloaded file transfers partial progress to a fresh browser only after confirmation', async ({ page, browser }, info) => {
  const partial = fixture(3);
  partial.revealedIds.push('letter-06');
  await seed(page, partial);
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки', exact: true }).tap();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Сохранить прогресс в файл' }).tap();
  const download = await downloading;
  const path = info.outputPath(download.suggestedFilename());
  await download.saveAs(path);
  const raw = readFileSync(path, 'utf8');
  expect(JSON.parse(raw).progress).toEqual(partial);

  const freshContext = await browser.newContext({ ...devices['iPhone 15 Pro'], reducedMotion: info.project.use.reducedMotion });
  try {
    const fresh = await freshContext.newPage();
    await fresh.goto('/');
    await fresh.getByRole('button', { name: 'Начать поиск', exact: true }).tap();
    const original = await fresh.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
    await fresh.evaluate(() => localStorage.setItem('dasha-winter:prototype-one-letter:v1', 'old-demo-untouched'));
    await fresh.getByRole('button', { name: 'Настройки', exact: true }).tap();
    await choose(fresh, raw);
    await expect(fresh.getByRole('heading', { name: 'Заменить текущий прогресс?' })).toBeFocused();
    await expect(fresh.locator('.restore-confirmation')).toContainText('Найдено: 3 из 14');
    const headingBox = await fresh.getByRole('heading', { name: 'Заменить текущий прогресс?' }).boundingBox();
    expect(headingBox!.y).toBeLessThan(120);
    expect(await fresh.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
    await fresh.screenshot({ path: info.outputPath('restore-preview.png') });
    await fresh.getByRole('button', { name: 'Оставить текущий прогресс' }).tap();
    expect(await fresh.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
    await choose(fresh, raw);
    await fresh.getByRole('button', { name: 'Заменить прогресс', exact: true }).tap();
    await expect(fresh.getByRole('dialog')).toHaveCount(0);
    await expect(fresh.locator('.counter')).toHaveText('Найдено 3 из 14');
    await expect(fresh.getByRole('heading', { level: 1 })).toHaveText(HOUSE[1].title);
    await expect(fresh.getByRole('button', { name: 'Забрать спрятанное письмо', exact: true })).toHaveCount(1);
    await fresh.reload();
    expect(await fresh.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)).toEqual(partial);
    expect(await fresh.evaluate(() => localStorage.getItem('dasha-winter:prototype-one-letter:v1'))).toBe('old-demo-untouched');
    expect(await fresh.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  } finally { await freshContext.close(); }
});

test('iPhone: complete imported archive restores reading and unwrap marks; bad files and storage failure preserve it', async ({ page }) => {
  await seed(page, fixture(2));
  await page.goto('/');
  await page.getByRole('button', { name: 'Настройки', exact: true }).tap();
  const original = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  for (const raw of ['{broken', JSON.stringify({ format: 'another-game' }), 'x'.repeat(MAX_BACKUP_BYTES + 1)]) {
    await choose(page, raw);
    await expect(page.locator('.transfer-error')).toBeVisible();
    await expect(page.locator('.restore-confirmation')).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
  }
  let full = fixture(14);
  full = progressReducer(full, { type: 'open', letterId: ids[0], at });
  full = progressReducer(full, { type: 'unwrap', letterId: ids[0], at });
  full = progressReducer(full, { type: 'open', letterId: ids[1], at });
  await choose(page, exportProgress(full));
  // Simulate quota/private storage failure after validation, immediately before replacement.
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await page.getByRole('button', { name: 'Заменить прогресс', exact: true }).tap();
  await expect(page.locator('.transfer-error')).toContainText('Текущий прогресс не изменён');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(original);
  await page.reload();
  await page.getByRole('button', { name: 'Настройки', exact: true }).tap();
  await choose(page, exportProgress(full));
  await page.getByRole('button', { name: 'Заменить прогресс', exact: true }).tap();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Все письма дома');
  await expect(page.locator('.desk-arrival')).toHaveCount(0);
  await expect(page.locator('.collection-envelope').first()).toHaveAccessibleName(/прочитано/);
  await expect(page.locator('.collection-check')).toHaveCount(1);
  await page.reload();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY)).toEqual(full);
});

test('iPhone: desk arrival can be skipped; reload during arrival returns to the saved desk', async ({ page }, info) => {
  await seed(page, fixture(14));
  await page.goto('/');
  await page.getByRole('button', { name: 'Прогуляться по дому', exact: true }).tap();
  await page.getByRole('button', { name: 'К столу с письмами', exact: true }).tap();
  if (info.project.use.reducedMotion === 'reduce') {
    await expect(page.locator('.desk-arrival')).toHaveCount(0);
  } else {
    await expect(page.getByRole('button', { name: 'Перейти к письмам', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Перейти к письмам', exact: true }).tap();
    await expect(page.locator('.desk-arrival')).toHaveCount(0);
    await page.getByRole('button', { name: 'Прогуляться по дому', exact: true }).tap();
    await page.getByRole('button', { name: 'К столу с письмами', exact: true }).tap();
    await page.reload();
  }
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Все письма дома');
  await expect(page.locator('.collection-envelope')).toHaveCount(14);
  await page.getByRole('button', { name: 'Открыть письмо', exact: true }).tap();
  await expect(page.locator('#letter-heading')).toBeVisible();
});

test('iPhone: damaged original is preserved until an explicitly confirmed valid restore', async ({ page }) => {
  await page.addInitScript((key) => { if (!localStorage.getItem(key)) localStorage.setItem(key, '{damaged-original'); }, STORAGE_KEY);
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать поиск', exact: true }).tap();
  await page.getByRole('button', { name: 'Настройки', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Скачать исходное сохранение' })).toBeVisible();
  await choose(page, exportProgress(fixture(3)));
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('{damaged-original');
  await page.getByRole('button', { name: 'Оставить текущий прогресс' }).tap();
  await page.getByRole('button', { name: 'Закрыть', exact: true }).tap();
  await page.reload();
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('{damaged-original');
  await page.getByRole('button', { name: 'Начать поиск', exact: true }).tap();
  await page.getByRole('button', { name: 'Настройки', exact: true }).tap();
  await choose(page, exportProgress(fixture(3)));
  await page.getByRole('button', { name: 'Заменить прогресс', exact: true }).tap();
  await expect(page.locator('.counter')).toHaveText('Найдено 3 из 14');
  await expect(page.locator('.storage-note')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.counter')).toHaveText('Найдено 3 из 14');
});

test('iPhone: failed desk image releases arrival; changing motion preference also releases controls', async ({ page }, info) => {
  // The desk must not have entered WebKit's in-memory image cache before the failed load.
  const partial = fixture(13);
  partial.currentScene = 'study';
  await seed(page, partial);
  await page.goto('/');
  await page.getByRole('button', { name: HOUSE[2].places[3].label, exact: true }).tap();
  await page.getByRole('button', { name: 'Забрать спрятанное письмо', exact: true }).tap();
  await page.route('**/assets/desk.webp', (route) => route.abort());
  await page.getByRole('button', { name: 'К столу с письмами', exact: true }).tap();
  await expect(page.locator('.image-error')).toBeVisible();
  await expect(page.locator('.desk-arrival')).toHaveCount(0);
  await page.getByRole('button', { name: 'Прогуляться по дому', exact: true }).tap();
  await page.unroute('**/assets/desk.webp');
  await page.getByRole('button', { name: 'К столу с письмами', exact: true }).tap();
  if (info.project.use.reducedMotion !== 'reduce') {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  }
  await expect(page.locator('.desk-arrival')).toHaveCount(0);
  await page.getByRole('button', { name: 'Открыть письмо', exact: true }).tap();
  await expect(page.locator('#letter-heading')).toBeVisible();
});

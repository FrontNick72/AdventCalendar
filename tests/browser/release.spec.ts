import { test, expect } from '@playwright/test';
import { HOUSE } from '../../src/scenes/house';
import { STORAGE_KEY } from '../../src/state/storage';

test('built iPhone: full landscape screen keeps the phone scene without the desktop sidebar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать поиск', exact: true }).tap();
  await page.setViewportSize({ width: 852, height: 393 });
  await expect(page.locator('.desktop-note')).toBeHidden();
  const phone = await page.locator('.phone').boundingBox();
  expect(phone!.width).toBe(393);
  expect(Math.abs(phone!.x + phone!.width / 2 - 852 / 2)).toBeLessThan(2);
  await page.getByRole('button', { name: HOUSE[0].places[0].label, exact: true }).tap();
  await page.getByRole('button', { name: 'Забрать спрятанное письмо', exact: true }).tap();
  await expect(page.locator('.counter')).toHaveText('Найдено 1 из 15');
  await page.setViewportSize({ width: 393, height: 659 });
  await expect(page.locator('.counter')).toHaveText('Найдено 1 из 15');
  await expect(page.locator('.desktop-note')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('built iPhone: delayed cold images and a failed room can recover without losing a find', async ({ page }) => {
  const errors: string[] = [];
  const origins = new Set<string>();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => origins.add(new URL(request.url()).origin));
  // Added latency only: this does not emulate mobile bandwidth or a physical radio.
  await page.route('**/assets/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 350));
    await route.continue();
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать поиск', exact: true }).tap();
  await expect(page.locator('.scene-image')).toHaveJSProperty('complete', true);
  expect(await page.locator('.scene-image').evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('button', { name: HOUSE[0].places[0].label, exact: true }).tap();
  await page.getByRole('button', { name: 'Забрать спрятанное письмо', exact: true }).tap();
  await expect(page.locator('.counter')).toHaveText('Найдено 1 из 15');
  await page.route(`**${HOUSE[1].image}`, (route) => route.abort());
  await page.locator('.room-navigation button').nth(1).tap();
  await expect(page.locator('.image-error')).toBeVisible();
  const before = await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);
  await page.unroute(`**${HOUSE[1].image}`);
  await page.getByRole('button', { name: 'Попробовать снова', exact: true }).tap();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(HOUSE[1].title);
  await expect(page.locator('.scene-image')).toHaveJSProperty('complete', true);
  expect(await page.locator('.scene-image').evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.locator('.image-error')).toHaveCount(0);
  await expect(page.locator('.counter')).toHaveText('Найдено 1 из 15');
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(origins).toEqual(new Set(['http://127.0.0.1:4183']));
  expect(errors).toEqual([]);
});

import { test, expect } from '@playwright/test';

test('music starts on tap, survives room changes, pauses and stays off after reload', async ({ page }) => {
  let requests = 0;
  page.on('request', (request) => { if (request.url().includes('/audio/')) requests++; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать поиск', exact: true }).tap();
  expect(requests).toBe(0);
  const enable = page.getByRole('button', { name: 'Включить музыку', exact: true });
  const box = await enable.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(44);
  expect(box?.height).toBeGreaterThanOrEqual(44);
  await enable.tap();
  await expect(page.getByRole('button', { name: 'Выключить музыку', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => page.locator('audio').evaluate((node: HTMLAudioElement) => node.currentTime)).toBeGreaterThan(0.1);
  expect(await page.locator('audio').evaluate((node: HTMLAudioElement) => node.loop)).toBe(true);
  await page.locator('.room-navigation button').nth(1).tap();
  await expect(page.getByRole('button', { name: 'Выключить музыку', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Выключить музыку', exact: true }).tap();
  expect(await page.locator('audio').evaluate((node: HTMLAudioElement) => node.paused)).toBe(true);
  await page.getByRole('button', { name: 'Включить музыку', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Выключить музыку', exact: true })).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await expect(page.getByRole('button', { name: 'Включить музыку', exact: true })).toBeVisible();
  expect(await page.locator('audio').evaluate((node: HTMLAudioElement) => node.paused)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Включить музыку', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('music network failure allows retry without affecting the search', async ({ page }) => {
  await page.route('**/audio/winter-house.m4a', (route) => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать поиск', exact: true }).tap();
  await page.getByRole('button', { name: 'Включить музыку', exact: true }).tap();
  await expect(page.getByText('Музыка не включилась. Нажми на ноту ещё раз.')).toBeVisible();
  await expect(page.locator('.counter')).toHaveText('Найдено 0 из 14');
  await page.unroute('**/audio/winter-house.m4a');
  await page.getByRole('button', { name: 'Включить музыку', exact: true }).tap();
  await expect(page.getByRole('button', { name: 'Выключить музыку', exact: true })).toBeVisible();
  await expect(page.getByText('Музыка не включилась. Нажми на ноту ещё раз.')).toHaveCount(0);
});

import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { HOUSE } from '../../src/scenes/house';
import { createProgress, progressReducer } from '../../src/state/progress';
import { STORAGE_KEY } from '../../src/state/storage';

const rawContent = JSON.parse(readFileSync(new URL('../../content/advent.json', import.meta.url), 'utf8'));

async function checkWidth(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('iPhone: real taps find 15 letters, restore a partial search and open the desk', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать поиск' }).tap();
  await expect(page.locator('.counter')).toHaveText('Найдено 0 из 15');
  await page.screenshot({ path: info.outputPath('nook.png') });
  let found = 0;
  for (const [index, scene] of HOUSE.entries()) {
    await page.locator('.room-navigation button').nth(index).tap();
    for (const [position, place] of scene.places.entries()) {
      const cover = page.getByRole('button', { name: place.label, exact: true });
      const box = await cover.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await cover.tap();
      if (index === 1 && position === 1) {
        // Reload with a revealed-but-not-collected letter, not only after a find.
        await page.reload();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(scene.title);
        await expect(page.locator('.counter')).toHaveText(`Найдено ${found} из 15`);
      }
      await page.getByRole('button', { name: 'Забрать спрятанное письмо', exact: true }).tap();
      found++;
      await expect(page.locator('.counter')).toHaveText(`Найдено ${found} из 15`);
      if (found < 15) await expect(page.getByRole('button', { name: 'К столу с письмами' })).toHaveCount(0);
      await checkWidth(page);
    }
  }
  await page.getByRole('button', { name: 'К столу с письмами' }).tap();
  await expect(page.locator('.collection-envelope')).toHaveCount(15);
  await expect(page.locator('.envelope-collection')).toHaveCSS('opacity', '1');
  await page.screenshot({ path: info.outputPath('desk.png') });
  for (let index = 0; index < 15; index++) {
    await page.locator('.collection-envelope').nth(index).tap();
    await page.getByRole('button', { name: 'Открыть письмо', exact: true }).tap();
    const title = rawContent.letters[index].envelopeTitle || `Письмо ${String(index + 1).padStart(2, '0')}`;
    await expect(page.locator('#letter-heading')).toHaveText(title);
    await expect(page.getByRole('button', { name: 'Я распаковала подарок' })).toHaveCount(0);
    await page.getByRole('button', { name: 'К конвертам', exact: true }).tap();
  }
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Все письма дома');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), STORAGE_KEY);
  const entries = Object.values(saved.letters) as { openedAt: string | null; unwrappedAt: string | null }[];
  expect(entries.filter((entry) => entry.openedAt)).toHaveLength(15);
  expect(entries.filter((entry) => entry.unwrappedAt)).toHaveLength(0);
  await checkWidth(page);
  expect(errors).toEqual([]);
});

test('iPhone: safe areas, a long ready letter and separate unwrapping survive rotation', async ({ page }, info) => {
  // This fixture is intercepted in the test browser only, never written to the author JSON.
  const fixture = structuredClone(rawContent);
  Object.assign(fixture.letters[3], {
    contentStatus: 'ready', envelopeTitle: 'Тест длинного письма', salutation: 'Даша,',
    paragraphs: Array.from({ length: 18 }, (_, index) => `Тестовый абзац ${index + 1}. Длинное письмо должно целиком прокручиваться на телефоне и оставаться читаемым при увеличении текста.`),
    signature: ['Тестовая подпись'], packageNumber: 4,
  });
  await page.route('**/content/advent.json*', (route) => route.fulfill({ contentType: 'application/javascript', body: `export default ${JSON.stringify(fixture)};` }));
  let state = createProgress(fixture.letters.map((letter: { id: string }) => letter.id));
  state = progressReducer(state, { type: 'intro' });
  for (const letter of fixture.letters) {
    state = progressReducer(state, { type: 'reveal', letterId: letter.id });
    state = progressReducer(state, { type: 'find', letterId: letter.id, at: '2026-11-04T12:00:00Z' });
  }
  await page.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, value); }, { key: STORAGE_KEY, value: JSON.stringify(state) });
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto('/');
  await page.addStyleTag({ content: ':root { --safe-top: 59px; --safe-bottom: 34px; }' });
  const bottom = await page.locator('.desk-bottom').boundingBox();
  expect(bottom!.y + bottom!.height).toBeLessThanOrEqual(852 - 34);
  await page.locator('.collection-envelope').nth(3).tap();
  await page.getByRole('button', { name: 'Открыть письмо', exact: true }).tap();
  await expect(page.locator('#letter-heading')).toHaveText('Тест длинного письма');
  await page.addStyleTag({ content: '.letter-body p { font-size: 24px; }' });
  expect(await page.locator('.scene').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.getByRole('button', { name: 'Я распаковала подарок', exact: true }).tap();
  await expect(page.getByText('Пусть этот сюрприз радует тебя')).toBeVisible();
  await page.getByRole('button', { name: 'Отменить отметку о распаковке' }).tap();
  await expect(page.getByRole('button', { name: 'Я распаковала подарок', exact: true })).toBeVisible();
  await checkWidth(page);
  await page.screenshot({ path: info.outputPath('long-letter.png') });
  // Safari's available viewport changes when rotated or its toolbars are shown.
  await page.setViewportSize({ width: 734, height: 343 });
  await page.getByRole('button', { name: 'К конвертам', exact: true }).tap();
  await page.locator('.collection-envelope').nth(3).tap();
  await page.getByRole('button', { name: 'Перечитать письмо', exact: true }).tap();
  await expect(page.locator('#letter-heading')).toHaveText('Тест длинного письма');
  await checkWidth(page);
  await page.setViewportSize({ width: 393, height: 659 });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Все письма дома');
});

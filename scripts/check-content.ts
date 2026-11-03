import { readFileSync } from 'node:fs';
import { assertReady, parseContent } from '../src/content/model.ts';

try {
  const content = parseContent(JSON.parse(readFileSync(new URL('../content/advent.json', import.meta.url), 'utf8')));
  assertReady(content);
  console.log('Все 15 писем заполнены; номера свёртков и ссылки на подарки уникальны.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Не удалось проверить содержание.');
  process.exitCode = 1;
}

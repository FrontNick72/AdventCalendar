import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const names = ['room', 'desk', 'cushion', 'tree', 'study'];
let total = 0;
for (const name of names) {
  const source = new URL(`../public/assets/${name}${['room', 'tree', 'study'].includes(name) ? '-clean' : ''}.png`, import.meta.url);
  const target = new URL(`../public/assets/${name}.webp`, import.meta.url);
  await sharp(fileURLToPath(source)).resize({ width: name === 'cushion' ? 420 : 910, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 }).toFile(fileURLToPath(target));
  const bytes = (await stat(target)).size;
  total += bytes;
  console.log(`${name}.webp: ${(bytes / 1024).toFixed(0)} KB`);
}
const atlas = new URL('../public/assets/props-atlas.png', import.meta.url);
const { width, height, hasAlpha } = await sharp(fileURLToPath(atlas)).metadata();
if (!hasAlpha) throw new Error('Sprite atlas must have an alpha channel.');
const props = ['book', 'drawer', 'globe', 'curtain', 'ornament', 'box', 'basket', 'stocking', 'frame'];
for (const [index, name] of props.entries()) {
  const left = Math.floor(index % 3 * width / 3);
  const top = Math.floor(Math.floor(index / 3) * height / 3);
  const right = Math.floor((index % 3 + 1) * width / 3);
  const bottom = Math.floor((Math.floor(index / 3) + 1) * height / 3);
  const target = new URL(`../public/assets/prop-${name}.webp`, import.meta.url);
  const cell = await sharp(fileURLToPath(atlas)).extract({ left, top, width: right - left, height: bottom - top }).png().toBuffer();
  await sharp(cell).trim({ threshold: 12 }).resize({ width: 300, height: 300, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85, effort: 6 }).toFile(fileURLToPath(target));
  const bytes = (await stat(target)).size;
  total += bytes;
  console.log(`prop-${name}.webp: ${(bytes / 1024).toFixed(0)} KB`);
}
console.log(`Total: ${(total / 1024).toFixed(0)} KB`);

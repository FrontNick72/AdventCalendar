import { mkdir, writeFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import QRCode from 'qrcode';
import { preview } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'phone-preview.local');
// Prefer physical Wi-Fi/Ethernet interfaces over VPNs and virtual adapters.
const addresses = Object.entries(networkInterfaces())
  .sort(([a], [b]) => Number(!/^(en|eth|wl)/.test(a)) - Number(!/^(en|eth|wl)/.test(b)))
  .flatMap(([, entries]) => entries ?? [])
  .filter((entry) => entry.family === 'IPv4' && !entry.internal && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(entry.address))
  .map((entry) => entry.address);
const address = addresses[0];
if (!address) {
  console.error('Не найден локальный IPv4-адрес. Подключи компьютер к домашнему Wi-Fi и повтори команду.');
  process.exit(1);
}

const server = await preview({ root, preview: { host: '0.0.0.0', port: 4173, strictPort: true } });
try {
  await mkdir(output, { recursive: true });
  for (const [index, ip] of [...new Set(addresses)].entries()) {
    const url = `http://${ip}:4173/`;
    const filename = index === 0 ? 'qr.png' : `qr-${ip}.png`;
    await QRCode.toFile(path.join(output, filename), url, { width: 720, margin: 4, errorCorrectionLevel: 'M' });
    console.log(`\n${index === 0 ? 'Открой на iPhone в Safari' : 'Другой локальный интерфейс'}: ${url}`);
    console.log(`QR-код: ${path.join(output, filename)}`);
  }
  const url = `http://${address}:4173/`;
  await writeFile(path.join(output, 'address.txt'), `${url}\n`, 'utf8');
  console.log(await QRCode.toString(url, { type: 'terminal', small: true }));
  console.log('iPhone и компьютер должны быть в одной домашней сети. Компьютер должен оставаться включённым.');
  console.log('Это временный адрес проверки готовой сборки. Прогресс другого адреса переносится через JSON.');
  console.log('После проверки останови сервер: Ctrl+C.');
} catch (error) {
  await new Promise((resolve) => server.httpServer.close(resolve));
  throw error;
}

let closing = false;
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    server.httpServer.close(() => process.exit(0));
  });
}

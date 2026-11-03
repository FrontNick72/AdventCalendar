export interface Letter {
  id: string;
  contentStatus: 'draft' | 'ready';
  envelopeTitle: string;
  salutation: string;
  paragraphs: string[];
  signature: string[];
  giftId: string | null;
  packageNumber: number | null;
  pickupNote: string | null;
}

export interface AdventContent {
  schemaVersion: 1;
  locale: 'ru-RU';
  recipientName: string;
  letterCount: number;
  letters: Letter[];
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parseContent(value: unknown): AdventContent {
  if (!object(value) || value.schemaVersion !== 1 || value.locale !== 'ru-RU' ||
      typeof value.recipientName !== 'string' || !value.recipientName.trim() ||
      !Number.isInteger(value.letterCount) || !Array.isArray(value.letters) ||
      value.letterCount !== value.letters.length || value.letters.length === 0) {
    throw new Error('Проверьте формат содержания и количество писем.');
  }

  const ids = new Set<string>();
  for (const letter of value.letters) {
    if (!object(letter) || typeof letter.id !== 'string' || !/^letter-\d{2}$/.test(letter.id) || ids.has(letter.id) ||
        !['draft', 'ready'].includes(String(letter.contentStatus)) ||
        typeof letter.envelopeTitle !== 'string' || typeof letter.salutation !== 'string' ||
        !strings(letter.paragraphs) || !strings(letter.signature) ||
        !(letter.giftId === null || typeof letter.giftId === 'string') ||
        !(letter.packageNumber === null || (Number.isInteger(letter.packageNumber) && Number(letter.packageNumber) > 0)) ||
        !(letter.pickupNote === null || typeof letter.pickupNote === 'string')) {
      throw new Error('Проверьте поля писем и уникальность их идентификаторов.');
    }
    ids.add(letter.id);
  }
  return value as unknown as AdventContent;
}

export function assertReady(content: AdventContent): void {
  if (content.letterCount !== 15) throw new Error('В готовом календаре должно быть 15 писем.');
  const packages = new Set<number>();
  const gifts = new Set<string>();
  for (const letter of content.letters) {
    if (letter.contentStatus !== 'ready' || !letter.envelopeTitle.trim() || !letter.salutation.trim() ||
        !letter.paragraphs.length || letter.paragraphs.some((p) => !p.trim()) ||
        !letter.signature.length || letter.signature.some((p) => !p.trim()) ||
        !letter.giftId?.trim() || letter.packageNumber === null || letter.packageNumber > 15 ||
        packages.has(letter.packageNumber) || gifts.has(letter.giftId)) {
      throw new Error(`Письмо ${letter.id} ещё не готово или повторяет номер свёртка/подарок.`);
    }
    packages.add(letter.packageNumber);
    gifts.add(letter.giftId);
  }
}

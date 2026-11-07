export const SCENE_IDS = ['nook', 'tree', 'study'] as const;
export type SceneId = typeof SCENE_IDS[number];
export type Cover = 'cushion' | 'book' | 'drawer' | 'globe' | 'curtain' | 'ornament' | 'box' | 'basket' | 'stocking' | 'frame' | 'notebook';
export interface HidingPlace {
  letterId: string; cover: Cover; label: string; hint: string; x: number; y: number; width: number;
}
export interface HouseScene {
  id: SceneId; title: string; shortTitle: string; image: string; places: HidingPlace[];
}
export const HOUSE: HouseScene[] = [
  { id: 'nook', title: 'Тихий уголок', shortTitle: 'У окна', image: '/assets/room.webp', places: [
    { letterId: 'letter-01', cover: 'cushion', label: 'Отодвинуть подушку', hint: 'Иногда секрет прячется там, где мягче всего.', x: 48, y: 55, width: 32 },
    { letterId: 'letter-02', cover: 'book', label: 'Открыть бордовую книгу', hint: 'На полке есть история, которую ещё не открывали.', x: 21, y: 30, width: 14 },
    { letterId: 'letter-03', cover: 'drawer', label: 'Выдвинуть ящик у кресла', hint: 'У маленького ящика тоже есть свой секрет.', x: 12, y: 53, width: 20 },
    { letterId: 'letter-04', cover: 'globe', label: 'Приподнять снежный шар', hint: 'Под маленькой зимой может ждать что-то тёплое.', x: 12, y: 45, width: 18 },
    { letterId: 'letter-05', cover: 'curtain', label: 'Отвести край шторы', hint: 'Загляни к самому краю заснеженного окна.', x: 91, y: 39, width: 14 },
  ] },
  { id: 'tree', title: 'Там, где ёлка', shortTitle: 'У ёлки', image: '/assets/tree.webp', places: [
    { letterId: 'letter-06', cover: 'ornament', label: 'Отвести большую ёлочную игрушку', hint: 'Одна игрушка бережёт маленький секрет.', x: 51, y: 36, width: 16 },
    { letterId: 'letter-07', cover: 'box', label: 'Приоткрыть коробочку под ёлкой', hint: 'Не все коробочки здесь для подарков.', x: 50, y: 64, width: 24 },
    { letterId: 'letter-08', cover: 'drawer', label: 'Открыть деревянный сундучок', hint: 'Посмотри на деревянный сундучок слева.', x: 30, y: 63, width: 28 },
    { letterId: 'letter-09', cover: 'basket', label: 'Отодвинуть плед в корзине', hint: 'Что-то мягкое устроилось в корзине.', x: 81, y: 61, width: 24 },
    { letterId: 'letter-10', cover: 'stocking', label: 'Заглянуть в новогодний носок', hint: 'Не забудь заглянуть в новогодний носок.', x: 78, y: 38, width: 16 },
  ] },
  { id: 'study', title: 'Кабинет историй', shortTitle: 'Кабинет', image: '/assets/study.webp', places: [
    { letterId: 'letter-11', cover: 'book', label: 'Раскрыть книгу в кабинете', hint: 'Среди историй на полке есть ещё одна для тебя.', x: 21, y: 34, width: 16 },
    { letterId: 'letter-12', cover: 'drawer', label: 'Выдвинуть ящик письменного стола', hint: 'У письменного стола есть потайное место.', x: 82, y: 62, width: 27 },
    { letterId: 'letter-13', cover: 'notebook', label: 'Приподнять блокнот', hint: 'Под чистыми страницами бывает самое интересное.', x: 49, y: 54, width: 22 },
    { letterId: 'letter-14', cover: 'frame', label: 'Отвести маленькую рамку', hint: 'Загляни за рамку рядом с лампой.', x: 75, y: 49, width: 19 },
  ] },
];
export function isSceneId(value: unknown): value is SceneId {
  return typeof value === 'string' && SCENE_IDS.includes(value as SceneId);
}

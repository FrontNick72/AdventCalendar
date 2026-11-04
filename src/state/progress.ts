import { isSceneId, type SceneId } from '../scenes/house';

export interface LetterProgress {
  foundAt: string | null;
  openedAt: string | null;
  unwrappedAt: string | null;
}

export interface Progress {
  schemaVersion: 2;
  currentScene: SceneId;
  introSeen: boolean;
  revealedIds: string[];
  letters: Record<string, LetterProgress>;
}

export type Action =
  | { type: 'restore'; progress: Progress }
  | { type: 'intro' }
  | { type: 'scene'; sceneId: SceneId }
  | { type: 'reveal'; letterId: string }
  | { type: 'find' | 'open' | 'unwrap'; letterId: string; at: string }
  | { type: 'undo-unwrap'; letterId: string }
  | { type: 'reset' };

export function createProgress(ids: string[]): Progress {
  return {
    schemaVersion: 2,
    currentScene: 'nook',
    introSeen: false,
    revealedIds: [],
    letters: Object.fromEntries(ids.map((id) => [id, { foundAt: null, openedAt: null, unwrappedAt: null }])),
  };
}

export function foundCount(state: Progress): number {
  return Object.values(state.letters).filter((letter) => letter.foundAt !== null).length;
}

export function isComplete(state: Progress): boolean {
  return Object.keys(state.letters).length > 0 && foundCount(state) === Object.keys(state.letters).length;
}

export function progressReducer(state: Progress, action: Action): Progress {
  if (action.type === 'restore') return action.progress;
  if (action.type === 'intro') return state.introSeen ? state : { ...state, introSeen: true };
  if (action.type === 'reset') return createProgress(Object.keys(state.letters));
  if (action.type === 'scene') return isSceneId(action.sceneId) ? { ...state, currentScene: action.sceneId } : state;
  if (!Object.hasOwn(state.letters, action.letterId)) return state;
  const previous = state.letters[action.letterId];
  if (action.type === 'reveal') {
    return state.revealedIds.includes(action.letterId) ? state : {
      ...state, revealedIds: [...state.revealedIds, action.letterId],
    };
  }
  let next: LetterProgress;
  switch (action.type) {
    case 'find':
      if (previous.foundAt || !state.revealedIds.includes(action.letterId)) return state;
      next = { ...previous, foundAt: action.at };
      break;
    case 'open':
      if (!isComplete(state) || !previous.foundAt || previous.openedAt) return state;
      next = { ...previous, openedAt: action.at };
      break;
    case 'unwrap':
      if (!previous.openedAt || previous.unwrappedAt) return state;
      next = { ...previous, unwrappedAt: action.at };
      break;
    case 'undo-unwrap':
      if (!previous.unwrappedAt) return state;
      next = { ...previous, unwrappedAt: null };
      break;
  }
  return { ...state, letters: { ...state.letters, [action.letterId]: next } };
}

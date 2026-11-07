import { useEffect, useReducer, useRef, useState } from 'react';
import rawContent from '../content/advent.json';
import { parseContent } from './content/model';
import { foundCount, isComplete, progressReducer, type Progress } from './state/progress';
import { restoreProgress, saveProgress, STORAGE_KEY, type StorageLike } from './state/storage';
import { downloadJson } from './state/transfer';
import { Icon, Sprig } from './components/Icons';
import { Modal } from './components/Modal';
import { Room } from './components/Room';
import { Desk } from './components/Desk';
import { LetterView } from './components/LetterView';
import { ProgressTransfer } from './components/ProgressTransfer';
import { Music } from './components/Music';
import { HOUSE } from './scenes/house';

function browserStorage(): StorageLike | null {
  try { return window.localStorage; } catch { return null; }
}

export default function App() {
  const [content] = useState(() => parseContent(rawContent));
  const [selectedId, setSelectedId] = useState(content.letters[0].id);
  const letter = content.letters.find((item) => item.id === selectedId)!;
  const ids = content.letters.map((entry) => entry.id);
  const [restored] = useState(() => restoreProgress(ids, browserStorage()));
  const [progress, dispatch] = useReducer(progressReducer, restored.progress);
  const [storageStatus, setStorageStatus] = useState(restored.status);
  const [view, setView] = useState<'room' | 'desk' | 'letter'>(() => isComplete(restored.progress) ? 'desk' : 'room');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);
  const [arrival, setArrival] = useState<'loading' | 'playing' | null>(null);
  const [notice, setNotice] = useState('');
  const skipArrival = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const complete = isComplete(progress);
  const entry = progress.letters[letter.id];
  const scene = HOUSE.find((item) => item.id === progress.currentScene)!;
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (storageStatus === 'ok' && !saveProgress(progress, browserStorage())) setStorageStatus('unavailable');
  }, [progress, storageStatus]);

  useEffect(() => {
    stage.current?.scrollTo({ top: 0, behavior: 'auto' });
    if (arrival) {
      skipArrival.current?.focus({ preventScroll: true });
    } else if (progress.introSeen) {
      const target = view === 'letter' ? document.getElementById('letter-heading') : heading.current;
      target?.focus({ preventScroll: true });
    }
  }, [view, progress.introSeen, progress.currentScene, arrival]);

  useEffect(() => {
    if (!arrival) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finish = () => setArrival(null);
    const onMotion = () => { if (motion.matches) finish(); };
    onMotion();
    motion.addEventListener('change', onMotion);
    // Also release the controls if the image never finishes loading.
    const timer = window.setTimeout(finish, arrival === 'loading' ? 7000 : 1900);
    return () => { clearTimeout(timer); motion.removeEventListener('change', onMotion); };
  }, [arrival]);

  function goToDesk() {
    if (!complete) return;
    setArrival(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? null : 'loading');
    setView('desk');
  }

  function restoreFromFile(next: Progress): boolean {
    // Write first: a failed import must leave both the screen and old save intact.
    if (!saveProgress(next, browserStorage())) return false;
    setStorageStatus('ok');
    dispatch({ type: 'restore', progress: next });
    setArrival(null);
    setSelectedId(content.letters[0].id);
    setView(isComplete(next) ? 'desk' : 'room');
    setSettingsOpen(false);
    setResetRequested(false);
    setNotice('Прогресс восстановлен из файла.');
    return true;
  }

  function openLetter() {
    if (!complete) return;
    dispatch({ type: 'open', letterId: letter.id, at: new Date().toISOString() });
    setView('letter');
  }

  function reset() {
    let writable = true;
    try { browserStorage()?.removeItem(STORAGE_KEY); } catch { writable = false; }
    setStorageStatus(writable && browserStorage() ? 'ok' : 'unavailable');
    dispatch({ type: 'reset' });
    setResetRequested(false);
    setSettingsOpen(false);
    setNotice('');
    setView('room');
  }

  function downloadOriginal() {
    if (!restored.raw) return;
    downloadJson(restored.raw, 'dasha-original-progress.json');
  }

  return <div className="app-shell">
    <aside className="desktop-note" aria-label="О зимнем доме">
      <span className="eyebrow">Маленький зимний дом</span>
      <Sprig />
      <h2>Письма<br /><em>для Даши</em></h2>
      <p>Там, где тепло.<br />Там, где тебя ждут.</p>
      <span className="desktop-note-rule" />
      <span className="prototype-label">Три комнаты. {content.letterCount} писем.<br />Каждое — в своё настроение.</span>
    </aside>
    <main className={`phone phone--${view}`}>
      <div className={`scene scene--${view === 'room' ? 'room' : 'desk'} ${arrival ? `desk-arrival desk-arrival--${arrival}` : ''}`} ref={stage}>
        <img className="scene-image" src={view === 'room' ? scene.image : '/assets/desk.webp'} alt="" onLoad={() => { setImageError(false); if (arrival === 'loading') setArrival('playing'); }} onError={() => { setImageError(true); setArrival(null); }} />
        {arrival && <><div className="desk-arrival-dimmer" aria-hidden="true" /><div className="desk-lamp-glow" aria-hidden="true" /></>}
        <div className="scene-shade" aria-hidden="true" />
        {view !== 'letter' && <header className="scene-header" inert={arrival !== null}>
          <p className="scene-eyebrow">{view === 'room' ? 'Маленький зимний дом' : 'Свет оставлен для тебя'}</p>
          <h1 ref={heading} tabIndex={-1}>{view === 'room' ? scene.title : 'Все письма дома'}</h1>
          {view === 'desk' && <p className="desk-subtitle">Выбирай по настроению</p>}
          <div className="counter paper" role="status"><Icon name="letter" /><span>Найдено {foundCount(progress)} из {content.letterCount}</span></div>
        </header>}
        {view === 'room' && <Room key={scene.id} scene={scene} progress={progress}
          onReveal={(letterId) => dispatch({ type: 'reveal', letterId })}
          onFind={(letterId) => dispatch({ type: 'find', letterId, at: new Date().toISOString() })}
          onScene={(sceneId) => dispatch({ type: 'scene', sceneId })}
          onGoToDesk={goToDesk} />}
        {view === 'desk' && complete && <div className="desk-interaction" inert={arrival !== null}><Desk letters={content.letters} selectedId={selectedId} progress={progress} onSelect={setSelectedId} onOpen={openLetter} onRoom={() => setView('room')} /></div>}
        {view === 'letter' && complete && entry.openedAt && <LetterView letter={letter} unwrapped={entry.unwrappedAt !== null}
          onUnwrap={() => dispatch({ type: 'unwrap', letterId: letter.id, at: new Date().toISOString() })}
          onUndo={() => dispatch({ type: 'undo-unwrap', letterId: letter.id })} onBack={() => setView('desk')} />}
        <Music hidden={arrival !== null} />
        {!arrival && <button className="settings-toggle icon-button" aria-label="Настройки" onClick={() => setSettingsOpen(true)}><Icon name="settings" /></button>}
        {arrival && <div className="desk-arrival-controls"><p role="status">Для тебя загорается свет</p><button ref={skipArrival} className="text-button on-dark" onClick={() => setArrival(null)}>Перейти к письмам</button></div>}
        <span className="visually-hidden" role="status">{notice}</span>
        {imageError && <p className="image-error" role="alert">Картинка комнаты не загрузилась. <button className="text-button" onClick={() => window.location.reload()}>Попробовать снова</button></p>}
        {storageStatus !== 'ok' && <div className="storage-note" role="status">{storageStatus === 'invalid' ? 'Не удалось прочитать сохранение. Открой настройки.' : 'Прогресс сохранится только в этом сеансе.'}</div>}
      </div>
    </main>
    {!progress.introSeen && !settingsOpen && <Modal title="Даша, заходи" className="welcome-dialog" onClose={() => dispatch({ type: 'intro' })}>
      <p>За окном снег, а здесь тепло.<br />И для тебя спрятано {content.letterCount} писем.</p>
      <p className="dialog-secondary">Присмотрись к вещам вокруг.<br />Некоторые хранят маленький секрет.</p>
      <button className="paper-button primary" onClick={() => dispatch({ type: 'intro' })}>Начать поиск <span aria-hidden="true">→</span></button>
    </Modal>}
    {settingsOpen && <Modal title="Наш маленький дом" onClose={() => { setSettingsOpen(false); setResetRequested(false); }}>
      <p>В трёх комнатах спрятано {content.letterCount} писем. Открывай, отодвигай и заглядывай за предметы. После всех находок зажжётся лампа у стола.</p>
      {content.letters.some((item) => item.contentStatus === 'draft') && <p>Пока это пробный проход: тексты писем ещё готовятся, номера свёртков не назначены.</p>}
      <p className="dialog-secondary">Находка, чтение и распаковка отмечаются отдельно. Прогресс сохраняется в этом браузере по этому адресу.</p>
      {storageStatus === 'invalid' && <div className="storage-explanation"><p>Исходное сохранение не изменено. Можно скачать его перед новым поиском.</p><button className="text-button" onClick={downloadOriginal}>Скачать исходное сохранение</button></div>}
      {storageStatus === 'unavailable' && <p role="status">Браузер не разрешил сохранение. После закрытия страницы прогресс может потеряться.</p>}
      <ProgressTransfer progress={progress} onRestore={restoreFromFile} />
      {resetRequested ? <div className="reset-confirmation"><p>Начать заново? Все находки, чтение и отметки распаковки будут сброшены.</p><button className="paper-button primary" onClick={reset}>Да, начать заново</button><button className="text-button" onClick={() => setResetRequested(false)}>Продолжить текущий поиск</button></div> :
        <button className="text-button reset-button" onClick={() => setResetRequested(true)}>Начать поиск заново</button>}
    </Modal>}
  </div>;
}

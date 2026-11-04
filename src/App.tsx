import { useEffect, useReducer, useRef, useState } from 'react';
import rawContent from '../content/advent.json';
import { parseContent } from './content/model';
import { foundCount, isComplete, progressReducer } from './state/progress';
import { restoreProgress, saveProgress, STORAGE_KEY, type StorageLike } from './state/storage';
import { Icon, Sprig } from './components/Icons';
import { Modal } from './components/Modal';
import { Room } from './components/Room';
import { Desk } from './components/Desk';
import { LetterView } from './components/LetterView';
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
    if (progress.introSeen) {
      const target = view === 'letter' ? document.getElementById('letter-heading') : heading.current;
      target?.focus({ preventScroll: true });
    }
  }, [view, progress.introSeen, progress.currentScene]);

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
    setView('room');
  }

  function downloadOriginal() {
    if (!restored.raw) return;
    const url = URL.createObjectURL(new Blob([restored.raw], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dasha-original-progress.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="app-shell">
    <aside className="desktop-note" aria-label="О зимнем доме">
      <span className="eyebrow">Маленький зимний дом</span>
      <Sprig />
      <h2>Письма<br /><em>для Даши</em></h2>
      <p>Там, где тепло.<br />Там, где тебя ждут.</p>
      <span className="desktop-note-rule" />
      <span className="prototype-label">Три комнаты. Пятнадцать писем.<br />Каждое — в своё настроение.</span>
    </aside>
    <main className={`phone phone--${view}`}>
      <div className={`scene scene--${view === 'room' ? 'room' : 'desk'}`} ref={stage}>
        <img className="scene-image" src={view === 'room' ? scene.image : '/assets/desk.webp'} alt="" onLoad={() => setImageError(false)} onError={() => setImageError(true)} />
        <div className="scene-shade" aria-hidden="true" />
        {view !== 'letter' && <header className="scene-header">
          <p className="scene-eyebrow">{view === 'room' ? 'Маленький зимний дом' : 'Свет оставлен для тебя'}</p>
          <h1 ref={heading} tabIndex={-1}>{view === 'room' ? scene.title : 'Все письма дома'}</h1>
          {view === 'desk' && <p className="desk-subtitle">Выбирай по настроению</p>}
          <div className="counter paper" role="status"><Icon name="letter" /><span>Найдено {foundCount(progress)} из {content.letterCount}</span></div>
        </header>}
        {view === 'room' && <Room key={scene.id} scene={scene} progress={progress}
          onReveal={(letterId) => dispatch({ type: 'reveal', letterId })}
          onFind={(letterId) => dispatch({ type: 'find', letterId, at: new Date().toISOString() })}
          onScene={(sceneId) => dispatch({ type: 'scene', sceneId })}
          onGoToDesk={() => { if (complete) setView('desk'); }} />}
        {view === 'desk' && complete && <Desk letters={content.letters} selectedId={selectedId} progress={progress} onSelect={setSelectedId} onOpen={openLetter} onRoom={() => setView('room')} />}
        {view === 'letter' && complete && entry.openedAt && <LetterView letter={letter} unwrapped={entry.unwrappedAt !== null}
          onUnwrap={() => dispatch({ type: 'unwrap', letterId: letter.id, at: new Date().toISOString() })}
          onUndo={() => dispatch({ type: 'undo-unwrap', letterId: letter.id })} onBack={() => setView('desk')} />}
        <button className="settings-toggle icon-button" aria-label="Настройки" onClick={() => setSettingsOpen(true)}><Icon name="settings" /></button>
        {imageError && <p className="image-error" role="alert">Картинка комнаты не загрузилась. <button className="text-button" onClick={() => window.location.reload()}>Попробовать снова</button></p>}
        {storageStatus !== 'ok' && <div className="storage-note" role="status">{storageStatus === 'invalid' ? 'Не удалось прочитать сохранение. Открой настройки.' : 'Прогресс сохранится только в этом сеансе.'}</div>}
      </div>
    </main>
    {!progress.introSeen && !settingsOpen && <Modal title="Даша, заходи" className="welcome-dialog" onClose={() => dispatch({ type: 'intro' })}>
      <p>За окном снег, а здесь тепло.<br />И для тебя спрятано 15 писем.</p>
      <p className="dialog-secondary">Присмотрись к вещам вокруг.<br />Некоторые хранят маленький секрет.</p>
      <button className="paper-button primary" onClick={() => dispatch({ type: 'intro' })}>Начать поиск <span aria-hidden="true">→</span></button>
    </Modal>}
    {settingsOpen && <Modal title="Наш маленький дом" onClose={() => { setSettingsOpen(false); setResetRequested(false); }}>
      <p>В трёх комнатах спрятано по пять писем. Открывай, отодвигай и заглядывай за предметы. После всех находок зажжётся лампа у стола.</p>
      {content.letters.some((item) => item.contentStatus === 'draft') && <p>Пока это пробный проход: тексты писем ещё готовятся, номера свёртков не назначены.</p>}
      <p className="dialog-secondary">Находка, чтение и распаковка отмечаются отдельно. Прогресс сохраняется в этом браузере по этому адресу.</p>
      {storageStatus === 'invalid' && <div className="storage-explanation"><p>Исходное сохранение не изменено. Можно скачать его перед новым поиском.</p><button className="text-button" onClick={downloadOriginal}>Скачать исходное сохранение</button></div>}
      {storageStatus === 'unavailable' && <p role="status">Браузер не разрешил сохранение. После закрытия страницы прогресс может потеряться.</p>}
      {resetRequested ? <div className="reset-confirmation"><p>Начать заново? Все находки, чтение и отметки распаковки будут сброшены.</p><button className="paper-button primary" onClick={reset}>Да, начать заново</button><button className="text-button" onClick={() => setResetRequested(false)}>Продолжить текущий поиск</button></div> :
        <button className="text-button reset-button" onClick={() => setResetRequested(true)}>Начать поиск заново</button>}
    </Modal>}
  </div>;
}

import { useEffect, useReducer, useRef, useState } from 'react';
import rawContent from '../content/prototype.json';
import { parseContent } from './content/model';
import { foundCount, isComplete, progressReducer } from './state/progress';
import { restoreProgress, saveProgress, STORAGE_KEY, type StorageLike } from './state/storage';
import { Icon, Sprig } from './components/Icons';
import { Modal } from './components/Modal';
import { Room } from './components/Room';
import { Desk } from './components/Desk';
import { LetterView } from './components/LetterView';

function browserStorage(): StorageLike | null {
  try { return window.localStorage; } catch { return null; }
}

export default function App() {
  const [content] = useState(() => parseContent(rawContent));
  const letter = content.letters[0];
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

  useEffect(() => {
    if (storageStatus === 'ok' && !saveProgress(progress, browserStorage())) setStorageStatus('unavailable');
  }, [progress, storageStatus]);

  useEffect(() => {
    stage.current?.scrollTo({ top: 0, behavior: 'instant' });
    if (progress.introSeen) {
      const target = view === 'letter' ? document.getElementById('letter-heading') : heading.current;
      target?.focus({ preventScroll: true });
    }
  }, [view, progress.introSeen]);

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
      <span className="prototype-label">Интерактивный эскиз<br />Одна комната. Одно письмо.</span>
    </aside>
    <main className={`phone phone--${view}`}>
      <div className={`scene scene--${view === 'room' ? 'room' : 'desk'}`} ref={stage}>
        <div className="scene-shade" aria-hidden="true" />
        {view !== 'letter' && <header className="scene-header">
          <p className="scene-eyebrow">{view === 'room' ? 'Маленький зимний дом' : 'Свет оставлен для тебя'}</p>
          <h1 ref={heading} tabIndex={-1}>{view === 'room' ? 'Тихий уголок' : 'Все письма дома'}</h1>
          {view === 'desk' && <p className="desk-subtitle">Выбирай по настроению</p>}
          <div className="counter paper" role="status"><Icon name="letter" /><span>Найдено {foundCount(progress)} из {content.letterCount}</span></div>
        </header>}
        {view === 'room' && <Room key={progress.introSeen ? 'entered' : 'welcome'} revealed={progress.revealedIds.includes(letter.id)} found={entry.foundAt !== null}
          onReveal={() => dispatch({ type: 'reveal', letterId: letter.id })}
          onFind={() => dispatch({ type: 'find', letterId: letter.id, at: new Date().toISOString() })}
          onGoToDesk={() => { if (complete) setView('desk'); }} />}
        {view === 'desk' && complete && <Desk letter={letter} progress={entry} onOpen={openLetter} onRoom={() => setView('room')} />}
        {view === 'letter' && complete && entry.openedAt && <LetterView letter={letter} unwrapped={entry.unwrappedAt !== null}
          onUnwrap={() => dispatch({ type: 'unwrap', letterId: letter.id, at: new Date().toISOString() })}
          onUndo={() => dispatch({ type: 'undo-unwrap', letterId: letter.id })} onBack={() => setView('desk')} />}
        <button className="settings-toggle icon-button" aria-label="Настройки и информация о прототипе" onClick={() => setSettingsOpen(true)}><Icon name="settings" /></button>
        {storageStatus !== 'ok' && <div className="storage-note" role="status">{storageStatus === 'invalid' ? 'Не удалось прочитать сохранение. Открой настройки.' : 'Прогресс сохранится только в этом сеансе.'}</div>}
      </div>
    </main>
    {!progress.introSeen && !settingsOpen && <Modal title="Даша, заходи" className="welcome-dialog" onClose={() => dispatch({ type: 'intro' })}>
      <p>За окном снег, а здесь тепло.<br />И для тебя спрятано письмо.</p>
      <p className="dialog-secondary">Присмотрись к вещам вокруг.<br />Некоторые хранят маленький секрет.</p>
      <button className="paper-button primary" onClick={() => dispatch({ type: 'intro' })}>Начать поиск <span aria-hidden="true">→</span></button>
    </Modal>}
    {settingsOpen && <Modal title="Наш маленький дом" onClose={() => { setSettingsOpen(false); setResetRequested(false); }}>
      <p>Это первый прототип: одна комната, один тайник и одно письмо. В полном доме их будет 15.</p>
      <p>Послание и номер 12 — примеры. Они не связаны с реальным списком подарков.</p>
      <p className="dialog-secondary">Находка, чтение и распаковка отмечаются отдельно. Прогресс сохраняется в этом браузере по этому адресу.</p>
      {storageStatus === 'invalid' && <div className="storage-explanation"><p>Исходное сохранение не изменено. Можно скачать его перед новым поиском.</p><button className="text-button" onClick={downloadOriginal}>Скачать исходное сохранение</button></div>}
      {storageStatus === 'unavailable' && <p role="status">Браузер не разрешил сохранение. После закрытия страницы прогресс может потеряться.</p>}
      {resetRequested ? <div className="reset-confirmation"><p>Начать заново? Находка, чтение и отметка распаковки в этом прототипе будут сброшены.</p><button className="paper-button primary" onClick={reset}>Да, начать заново</button><button className="text-button" onClick={() => setResetRequested(false)}>Продолжить текущий поиск</button></div> :
        <button className="text-button reset-button" onClick={() => setResetRequested(true)}>Начать прототип заново</button>}
    </Modal>}
  </div>;
}

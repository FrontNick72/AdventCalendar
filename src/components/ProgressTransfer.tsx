import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { foundCount, type Progress } from '../state/progress';
import { downloadJson, exportProgress, importProgress, MAX_BACKUP_BYTES, type ProgressBackup } from '../state/transfer';

function summary(progress: Progress) {
  const letters = Object.values(progress.letters);
  return `Найдено: ${foundCount(progress)} из ${letters.length}. Прочитано: ${letters.filter((letter) => letter.openedAt).length}. Распаковано: ${letters.filter((letter) => letter.unwrappedAt).length}.`;
}

export function ProgressTransfer({ progress, onRestore }: { progress: Progress; onRestore: (progress: Progress) => boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const confirmation = useRef<HTMLHeadingElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const request = useRef(0);
  const [pending, setPending] = useState<{ backup: ProgressBackup; filename: string } | null>(null);
  const [reading, setReading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => { request.current++; }, []);
  useEffect(() => {
    if (!pending) return;
    confirmation.current?.focus({ preventScroll: true });
    confirmation.current?.scrollIntoView({ block: 'start' });
  }, [pending]);
  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);

  function save() {
    try {
      downloadJson(exportProgress(progress), `dasha-winter-progress-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage('Файл подготовлен. Сохрани его в «Файлы», чтобы продолжить поиск на другом устройстве.');
      setError('');
    } catch { setError('Не удалось подготовить файл. Попробуй скачать его ещё раз.'); }
  }

  async function read(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const current = ++request.current;
    setPending(null); setError(''); setMessage(''); setReading(true);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Файл слишком большой. Выбери сохранение размером до 128 КБ.');
      let raw: string;
      try { raw = await file.text(); }
      catch { throw new Error('Не удалось прочитать файл. Попробуй выбрать его снова.'); }
      const backup = importProgress(raw, Object.keys(progress.letters));
      if (current === request.current) setPending({ backup, filename: file.name });
    } catch (cause) {
      if (current === request.current) setError(cause instanceof Error ? cause.message : 'Не удалось прочитать файл. Попробуй выбрать его снова.');
    } finally { if (current === request.current) setReading(false); }
  }

  return <section className="progress-transfer" aria-labelledby="transfer-heading">
    <h3 id="transfer-heading">Сохранить наш путь</h3>
    <p className="dialog-secondary">Скачай копию перед сменой телефона или браузера. На другом устройстве открой этот сайт и выбери сохранённый файл здесь.</p>
    <button className="paper-button primary" onClick={save}>Сохранить прогресс в файл</button>
    <input ref={input} type="file" accept=".json,application/json" hidden onChange={read} />
    <button ref={chooseButton} className="text-button" disabled={reading} onClick={() => input.current?.click()}>{reading ? 'Читаю сохранение…' : 'Восстановить из файла'}</button>
    {message && <p className="transfer-message" role="status">{message}</p>}
    {error && <p ref={errorMessage} className="transfer-error" role="alert" tabIndex={-1}>{error}</p>}
    {pending && <div className="restore-confirmation">
      <h3 ref={confirmation} tabIndex={-1}>Заменить текущий прогресс?</h3>
      <p className="backup-filename">Файл: {pending.filename}</p>
      <p className="dialog-secondary">Копия от {new Date(pending.backup.exportedAt).toLocaleString('ru-RU')}.</p>
      <p><strong>Сейчас</strong><br />{summary(progress)}</p>
      <p><strong>В файле</strong><br />{summary(pending.backup.progress)}</p>
      <p>Находки, прочитанные письма и отметки распаковки будут заменены данными из файла. Сначала можно сохранить текущую копию кнопкой выше.</p>
      <button className="paper-button primary" onClick={() => {
        if (!onRestore(pending.backup.progress)) setError('Не удалось записать сохранение в браузер. Текущий прогресс не изменён. Проверь доступ к хранилищу и попробуй снова.');
      }}>Заменить прогресс</button>
      <button className="text-button" onClick={() => { setPending(null); setError(''); chooseButton.current?.focus(); }}>Оставить текущий прогресс</button>
    </div>}
  </section>;
}

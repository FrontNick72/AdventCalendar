import { letterTitle, type Letter } from '../content/model';
import type { Progress } from '../state/progress';
import { Envelope } from './Envelope';
import { Icon } from './Icons';

export function Desk({ letters, selectedId, progress, onSelect, onOpen, onRoom }: {
  letters: Letter[]; selectedId: string; progress: Progress;
  onSelect: (id: string) => void; onOpen: () => void; onRoom: () => void;
}) {
  const index = letters.findIndex((letter) => letter.id === selectedId);
  const letter = letters[index];
  const entry = progress.letters[letter.id];
  function move(delta: number) { onSelect(letters[(index + delta + letters.length) % letters.length].id); }

  return <div className="desk-content">
    <div className="envelope-collection" role="group" aria-label={`Все ${letters.length} конвертов`}>
      {letters.map((item, position) => <button key={item.id} className={`collection-envelope ${item.id === selectedId ? 'collection-envelope--selected' : ''}`}
        aria-label={`Выбрать письмо «${letterTitle(item)}»${progress.letters[item.id].openedAt ? ', прочитано' : ''}`}
        aria-pressed={item.id === selectedId} onClick={() => onSelect(item.id)}>
        <Envelope small opened={progress.letters[item.id].openedAt !== null} />
        <span className="collection-number">{String(position + 1).padStart(2, '0')}</span>
        {progress.letters[item.id].unwrappedAt && <span className="collection-check"><Icon name="check" /></span>}
      </button>)}
    </div>
    <div className="selected-envelope" aria-live="polite" aria-atomic="true">
      <span className="visually-hidden">{letterTitle(letter)}</span>
      <span className="selection-count">{index + 1} / {letters.length}{letter.contentStatus === 'draft' ? ' · черновик' : ''}</span>
      <div className="selection-row">
        <button className="icon-button on-dark" aria-label="Предыдущее письмо" onClick={() => move(-1)}><Icon name="arrow" /></button>
        <div className="selected-envelope-art"><Envelope title={letterTitle(letter)} opened={entry.openedAt !== null} /></div>
        <button className="icon-button on-dark next-letter" aria-label="Следующее письмо" onClick={() => move(1)}><Icon name="arrow" /></button>
      </div>
    </div>
    <div className="desk-bottom">
      <p className="letter-state">{entry.unwrappedAt ? <><Icon name="check" /> Подарок распакован</> : entry.openedAt ? 'Это письмо можно перечитать' : 'Открой, когда захочется именно этого'}</p>
      <button className="paper-button primary" onClick={onOpen}>{entry.openedAt ? 'Перечитать письмо' : 'Открыть письмо'} <Icon name="letter" /></button>
      <button className="text-button on-dark" onClick={onRoom}>Прогуляться по дому</button>
    </div>
  </div>;
}

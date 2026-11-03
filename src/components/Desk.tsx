import type { Letter } from '../content/model';
import type { LetterProgress } from '../state/progress';
import { Envelope } from './Envelope';
import { Icon, Sprig } from './Icons';

export function Desk({ letter, progress, onOpen, onRoom }: {
  letter: Letter; progress: LetterProgress; onOpen: () => void; onRoom: () => void;
}) {
  return <div className="desk-content">
    <div className="desk-invitation"><p>Маленькое письмо.<br />Немного тепла для тебя.</p><Sprig /></div>
    <button className="desk-envelope" onClick={onOpen} aria-label={`Выбрать письмо «${letter.envelopeTitle}»`}>
      <Envelope title={letter.envelopeTitle} opened={progress.openedAt !== null} />
    </button>
    <div className="desk-bottom">
      <p className="letter-state">{progress.unwrappedAt ? <><Icon name="check" /> Подарок распакован</> : progress.openedAt ? 'Это письмо можно перечитать' : 'Открой, когда захочется именно этого'}</p>
      <button className="paper-button primary" onClick={onOpen}>{progress.openedAt ? 'Перечитать письмо' : 'Открыть письмо'} <Icon name="letter" /></button>
      <button className="text-button on-dark" onClick={onRoom}>Вернуться в тихий уголок</button>
    </div>
  </div>;
}

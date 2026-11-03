import { useState } from 'react';
import { Envelope } from './Envelope';
import { Icon } from './Icons';

interface RoomProps {
  revealed: boolean;
  found: boolean;
  onReveal: () => void;
  onFind: () => void;
  onGoToDesk: () => void;
}

export function Room({ revealed, found, onReveal, onFind, onGoToDesk }: RoomProps) {
  const [hint, setHint] = useState(0);
  const message = found ? 'Письмо ждёт тебя у лампы.' : revealed ? (hint > 0 ? 'Нажми на конверт за подушкой.' : 'Кажется, здесь что-то спрятано…') :
    hint === 0 ? 'Загляни в уютные уголки' : hint === 1 ? 'Иногда письмо прячется там, где мягче всего.' : 'Попробуй отодвинуть подушку на кресле.';

  return <div className="room-content">
    <div className="room-objects">
      {!found && <button className={`hidden-letter ${revealed ? 'hidden-letter--revealed' : ''}`} onClick={onFind}
        aria-label="Забрать спрятанное письмо" disabled={!revealed} aria-hidden={!revealed} tabIndex={revealed ? 0 : -1}>
        <Envelope small />
      </button>}
      <button className={`cushion ${revealed ? 'cushion--moved' : ''} ${hint >= 2 && !revealed ? 'cushion--hint' : ''}`}
        aria-label={revealed ? 'Подушка отодвинута' : 'Отодвинуть подушку на кресле'} onClick={onReveal} disabled={revealed}>
        <img src="/assets/cushion.png" alt="" draggable="false" />
      </button>
    </div>
    <div className="room-bottom">
      <p className="scene-whisper" aria-live="polite">{message}</p>
      {found ? <div className="found-note paper">
        <Icon name="letter" />
        <p className="found-note-title">Письмо нашлось!</p>
        <p>Теперь можно устроиться у лампы.</p>
        <button className="paper-button primary" onClick={onGoToDesk}>К столу с письмами <span aria-hidden="true">→</span></button>
      </div> : <button className="paper-button hint-button" onClick={() => setHint((current) => Math.min(current + 1, 2))}>
        <Icon name="star" /> Подсказка
      </button>}
      <span className="room-location"><span /> Уголок у окна <span /></span>
    </div>
  </div>;
}

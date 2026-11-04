import { useState, type CSSProperties } from 'react';
import { HOUSE, type HouseScene, type SceneId } from '../scenes/house';
import { isComplete, type Progress } from '../state/progress';
import { Envelope } from './Envelope';
import { Icon } from './Icons';

interface RoomProps {
  scene: HouseScene; progress: Progress;
  onReveal: (id: string) => void; onFind: (id: string) => void;
  onScene: (id: SceneId) => void; onGoToDesk: () => void;
}

export function Room({ scene, progress, onReveal, onFind, onScene, onGoToDesk }: RoomProps) {
  const [hint, setHint] = useState(0);
  const [lastFound, setLastFound] = useState(false);
  const remaining = scene.places.filter((place) => !progress.letters[place.letterId].foundAt);
  const target = remaining[0];
  const complete = isComplete(progress);
  const revealed = target && progress.revealedIds.includes(target.letterId);
  const message = complete ? 'Все письма нашлись. Лампа ждёт тебя.' : !target ? 'Здесь все письма нашлись. Заглянем дальше?' : hint === 0 ?
    (lastFound ? 'Ещё одно письмо дома. Продолжим?' : 'У вещей вокруг есть маленькие секреты') : hint === 1 ? target.hint : revealed ? 'Теперь нажми на показавшийся конверт.' : target.label + '.';

  return <div className="room-content">
    <div className="room-objects" aria-label={`Тайники: ${scene.title}`}>
      {scene.places.map((place) => {
        const found = progress.letters[place.letterId].foundAt !== null;
        const open = progress.revealedIds.includes(place.letterId);
        const highlighted = hint >= 2 && target?.letterId === place.letterId;
        return <div key={place.letterId} className={`hiding-place hiding-place--${place.cover} ${open ? 'hiding-place--open' : ''} ${highlighted ? 'hiding-place--hint' : ''}`}
          style={{ '--x': `${place.x}%`, '--y': `${place.y}%`, '--w': `${place.width}%` } as CSSProperties}>
          {open && !found && <button className="cache-letter" aria-label="Забрать спрятанное письмо" onClick={() => {
            onFind(place.letterId); setHint(0); setLastFound(true);
          }}><Envelope small /></button>}
          <button className={`cache-cover cache-cover--${place.cover}`} disabled={open}
            aria-label={open ? `${place.label}: уже проверено` : place.label} onClick={() => { onReveal(place.letterId); setLastFound(false); }}>
            <img src={place.cover === 'cushion' ? '/assets/cushion.webp' : `/assets/prop-${place.cover === 'notebook' ? 'book' : place.cover}.webp`} alt="" draggable="false" />
          </button>
        </div>;
      })}
    </div>
    <div className="house-controls">
      <p className="scene-whisper" role="status">{message}</p>
      {complete ? <button className="paper-button primary" onClick={onGoToDesk}>К столу с письмами <span aria-hidden="true">→</span></button> :
        <button className="paper-button hint-button" disabled={!target} onClick={() => setHint((value) => Math.min(value + 1, 2))}><Icon name="star" /> Подсказка</button>}
      <nav className="room-navigation" aria-label="Комнаты дома">{HOUSE.map((room) => {
        const count = room.places.filter((place) => progress.letters[place.letterId].foundAt).length;
        return <button key={room.id} aria-current={room.id === scene.id ? 'location' : undefined} onClick={() => onScene(room.id)}>
          <span>{room.shortTitle}</span><small>{count} / {room.places.length}</small>
        </button>;
      })}</nav>
    </div>
  </div>;
}

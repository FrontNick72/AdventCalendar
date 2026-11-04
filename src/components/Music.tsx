import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

export function Music({ hidden }: { hidden: boolean }) {
  const audio = useRef<HTMLAudioElement>(null);
  const attempt = useRef(0);
  const [status, setStatus] = useState<'off' | 'loading' | 'playing'>('off');
  const [error, setError] = useState(false);

  useEffect(() => {
    const player = audio.current!;
    const stop = () => {
      attempt.current++;
      player.pause();
      setStatus('off');
    };
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', stop);
    return () => {
      attempt.current++;
      player.pause();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', stop);
    };
  }, []);

  function toggle() {
    const player = audio.current!;
    const current = ++attempt.current;
    setError(false);
    if (status !== 'off') {
      player.pause();
      setStatus('off');
      return;
    }
    // Assign only on request; play() stays in the tap handler for iOS Safari.
    if (!player.getAttribute('src')) player.src = '/audio/winter-house.m4a';
    setStatus('loading');
    void player.play().then(() => {
      if (attempt.current === current) setStatus(player.paused ? 'off' : 'playing');
    }).catch(() => {
      if (attempt.current !== current) return;
      setStatus('off');
      setError(true);
      // A new tap can retry a failed network request.
      player.removeAttribute('src');
      player.load();
    });
  }

  return <>
    <audio ref={audio} loop preload="none" playsInline
      onPlaying={() => setStatus('playing')}
      onPause={() => setStatus('off')}
      onError={() => {
        if (!audio.current?.getAttribute('src')) return;
        attempt.current++;
        setStatus('off');
        setError(true);
        audio.current.removeAttribute('src');
        audio.current.load();
      }} />
    <div className="music-controls" hidden={hidden}>
      <button className="music-toggle icon-button" onClick={toggle}
        aria-pressed={status !== 'off'}
        aria-label={status === 'loading' ? 'Отменить загрузку музыки' : status === 'playing' ? 'Выключить музыку' : 'Включить музыку'}
        title={status === 'off' ? 'Включить музыку' : 'Выключить музыку'}>
        <Icon name="music" />
        {status !== 'off' && <span className="music-dot" aria-hidden="true" />}
      </button>
      <span className="visually-hidden" role="status">{status === 'loading' ? 'Музыка загружается.' : status === 'playing' ? 'Играет зимняя мелодия.' : ''}</span>
      {error && <p className="music-error" role="status">Музыка не включилась. Нажми на ноту ещё раз.</p>}
    </div>
  </>;
}

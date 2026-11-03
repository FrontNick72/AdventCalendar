import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon, Sprig } from './Icons';

export function Modal({ title, onClose, children, className = '' }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} className={`paper-dialog paper ${className}`} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <button className="icon-button dialog-close" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
    <Sprig className="dialog-sprig" />
    <h2 id={titleId}>{title}</h2>
    {children}
  </dialog>;
}

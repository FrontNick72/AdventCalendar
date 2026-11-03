import { Sprig } from './Icons';

export function Envelope({ title, opened = false, small = false }: { title?: string; opened?: boolean; small?: boolean }) {
  return <span className={`envelope ${opened ? 'envelope--opened' : ''} ${small ? 'envelope--small' : ''}`} aria-hidden="true">
    {opened && <span className="envelope-insert" />}
    <span className="envelope-folds" />
    <span className="envelope-flap" />
    {title && <span className="envelope-title">{title}</span>}
    {!small && <Sprig className="envelope-sprig" />}
    <span className="wax-seal"><span>❦</span></span>
  </span>;
}

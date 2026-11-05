import { letterTitle, type Letter } from '../content/model';
import { Icon, Sprig } from './Icons';

export function LetterView({ letter, unwrapped, onUnwrap, onUndo, onBack }: {
  letter: Letter; unwrapped: boolean; onUnwrap: () => void; onUndo: () => void; onBack: () => void;
}) {
  return <section className="letter-view" aria-label="Открытое письмо">
    <button className="back-button" onClick={onBack}><Icon name="arrow" /> К конвертам</button>
    <article className="letter-paper paper" aria-labelledby="letter-heading">
      <Sprig className="paper-corner paper-corner--left" />
      <Sprig className="paper-corner paper-corner--right" />
      <h1 id="letter-heading" tabIndex={-1}>{letterTitle(letter)}</h1>
      <div className="letter-rule" aria-hidden="true">❦</div>
      {letter.salutation.trim() && <p className="salutation">{letter.salutation}</p>}
      <div className="letter-body">{letter.paragraphs.length ? letter.paragraphs.map((paragraph, index) => <p key={`${letter.id}-paragraph-${index}`}>{paragraph}</p>) : <p>Здесь будет твоё личное послание. Это письмо пока готовится.</p>}</div>
      <p className="letter-signature">{letter.signature.map((line, index) => <span key={`${letter.id}-signature-${index}`}>{line}</span>)}</p>
      <div className="gift-instruction">
        <Sprig />
        <p className="gift-caption">Твой сюрприз</p>
        {letter.packageNumber !== null ? <p className="package-number" aria-label={`Свёрток номер ${letter.packageNumber}`}><span>№</span> {letter.packageNumber}</p> : <p className="pending-number">Номер появится здесь</p>}
        <p>{letter.pickupNote || (letter.packageNumber !== null ? 'Найди свёрток с этим номером в коробке.' : 'Это письмо ещё готовится.')}</p>
      </div>
    </article>
    <div className="unwrap-area" aria-live="polite">
      {unwrapped ? <>
        <div className="unwrapped-note paper"><Icon name="check" /><span>Пусть этот сюрприз радует тебя</span></div>
        <button className="text-button on-dark" onClick={onUndo}>Отменить отметку о распаковке</button>
      </> : letter.packageNumber !== null && letter.contentStatus === 'ready' ? <button className="paper-button primary" onClick={onUnwrap}><Icon name="gift" /> Я распаковала подарок</button> : null}
      {letter.contentStatus === 'draft' && <p className="demo-caption">Черновик · текст и соответствие подарку ещё не утверждены</p>}
    </div>
  </section>;
}

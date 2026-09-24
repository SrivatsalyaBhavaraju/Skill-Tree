import type { FlashCard } from '../lib/schema'

type Props = {
  card: FlashCard
  flipped: boolean
  graded: boolean | undefined
  onFlip: () => void
  onGrade: (gotIt: boolean) => void
}

export function Flashcard({ card, flipped, graded, onFlip, onGrade }: Props) {
  return (
    <div className="flashcard-wrap">
      <button
        type="button"
        className={flipped ? 'flashcard flashcard--flipped' : 'flashcard'}
        onClick={onFlip}
        aria-label={flipped ? `Answer: ${card.back}. Flip back to the question` : `Question: ${card.front}. Flip to see the answer`}
      >
        <span className="flashcard__inner">
          <span className="flashcard__face flashcard__face--front" aria-hidden={flipped}>
            <span className="flashcard__side">Question</span>
            <span className="flashcard__text">{card.front}</span>
            <span className="flashcard__hint">Tap or press Space to flip</span>
          </span>
          <span className="flashcard__face flashcard__face--back" aria-hidden={!flipped}>
            <span className="flashcard__side">Answer</span>
            <span className="flashcard__text">{card.back}</span>
          </span>
        </span>
      </button>

      {flipped && graded === undefined && (
        <div className="grade" role="group" aria-label="How did you do?">
          <button type="button" className="choice choice--grade-missed" onClick={() => onGrade(false)}>
            <kbd className="choice__key">1</kbd>
            <span className="choice__label">Missed it</span>
          </button>
          <button type="button" className="choice choice--grade-got" onClick={() => onGrade(true)}>
            <kbd className="choice__key">2</kbd>
            <span className="choice__label">Got it</span>
          </button>
        </div>
      )}

      <div role="status">
        {graded !== undefined && (
          <div className={graded ? 'feedback feedback--right' : 'feedback feedback--wrong'}>
            <strong>{graded ? 'Nice. Marked as known.' : 'Added to your mistakes to review.'}</strong>
          </div>
        )}
        <span className="sr-only">{flipped && graded === undefined ? `Answer: ${card.back}` : ''}</span>
      </div>
    </div>
  )
}

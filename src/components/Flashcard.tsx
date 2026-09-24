import type { FlashCard } from '../lib/schema'

type Props = {
  card: FlashCard
  flipped: boolean
  onFlip: () => void
}

export function Flashcard({ card, flipped, onFlip }: Props) {
  return (
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
  )
}

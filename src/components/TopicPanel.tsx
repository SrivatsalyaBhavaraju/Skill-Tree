import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { isCorrect, type Answer, type Confidence } from '../lib/progress'
import type { Deck } from '../lib/deck'
import type { Grounding } from '../lib/grounding'
import type { Card } from '../lib/schema'
import type { Progress } from '../lib/tree'
import { Choices } from './Choices'
import { ConfidencePicker } from './ConfidencePicker'
import { Flashcard } from './Flashcard'
import { Source } from './Source'
import './TopicPanel.css'

type Props = {
  deck: Deck
  progress: Progress
  grounding: Record<string, Grounding> | null
  onAnswer: (cardId: string, correct: boolean, confidence: Confidence | undefined) => void
  onFix: (cardId: string) => Promise<boolean>
  onClose: () => void
}

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const TRUE_FALSE = [
  { label: 'True', key: 'T' },
  { label: 'False', key: 'F' },
]

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  const next = { ...record }
  delete next[key]
  return next
}

function keyToAnswer(card: Card, key: string, flipped: boolean): Answer | null {
  const lower = key.toLowerCase()

  if (card.type === 'mcq') {
    const index = Number(key) - 1
    return Number.isInteger(index) && index >= 0 && index < card.options.length ? index : null
  }
  if (card.type === 'truefalse') {
    if (lower === 't' || key === '1') return true
    if (lower === 'f' || key === '2') return false
    return null
  }
  if (!flipped) return null
  if (key === '1') return false
  if (key === '2') return true
  return null
}

function keyHint(card: Card): string {
  if (card.type === 'mcq') return `1–${card.options.length} answer · ← → move · Esc close`
  if (card.type === 'truefalse') return 'T / F answer · ← → move · Esc close'
  return 'Space flip · 1 missed · 2 got it · ← → move · Esc close'
}

export function TopicPanel({ deck, progress, grounding, onAnswer, onFix, onClose }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [confidence, setConfidence] = useState<Record<string, Confidence>>({})
  const [closing, setClosing] = useState(false)
  const [fixing, setFixing] = useState<string | null>(null)
  const mounted = useRef(true)

  const card = deck.cards[index]
  const answer = answers[card.id]
  const sureness = confidence[card.id]
  const askSureness = answer === undefined && !(card.type === 'flashcard' && flipped)
  const confidentlyWrong = answer !== undefined && sureness === 'certain' && !isCorrect(card, answer)
  const isFirst = index === 0
  const isLast = index === deck.cards.length - 1

  function go(step: number) {
    const next = index + step
    if (next < 0 || next >= deck.cards.length) return
    setIndex(next)
    setFlipped(false)
  }

  function close() {
    if (calm()) onClose()
    else setClosing(true)
  }

  async function fix() {
    const cardId = card.id
    setFixing(cardId)
    const replaced = await onFix(cardId)
    if (!mounted.current) return
    setFixing(null)
    if (!replaced) return
    setFlipped(false)
    setAnswers((current) => without(current, cardId))
    setConfidence((current) => without(current, cardId))
  }

  function choose(value: Answer) {
    if (answers[card.id] !== undefined) return
    setAnswers((current) => ({ ...current, [card.id]: value }))
    onAnswer(card.id, isCorrect(card, value), confidence[card.id])
  }

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    mounted.current = true

    return () => {
      mounted.current = false
      document.body.style.overflow = scroll
      opener?.focus()
    }
  }, [])

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const onButton = event.target instanceof HTMLButtonElement
    const picked = keyToAnswer(card, event.key, flipped)

    if (picked !== null && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault()
      choose(picked)
    } else if (event.key === 'Escape') {
      close()
    } else if (event.key === 'ArrowRight') {
      go(1)
    } else if (event.key === 'ArrowLeft') {
      go(-1)
    } else if (event.key === ' ' && !onButton && card.type === 'flashcard') {
      event.preventDefault()
      setFlipped((value) => !value)
    } else if (event.key === 'Tab') {
      const focusable = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <div className={closing ? 'panel-layer panel-layer--closing' : 'panel-layer'}>
      <div className="panel-layer__shade" onClick={close} />

      <div
        ref={panel}
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onAnimationEnd={(event) => {
          if (closing && event.target === event.currentTarget) onClose()
        }}
      >
        <header className="panel__head">
          <div>
            <p className="panel__eyebrow">
              {deck.review ? `Mistake ${index + 1} of ${deck.cards.length} · ${deck.topicOf[card.id]}` : `Card ${index + 1} of ${deck.cards.length}`}
              {deck.review && progress[card.id] === 'confident_miss' && <span className="panel__sure">You were sure</span>}
            </p>
            <h2 id={titleId} className="panel__title">
              {deck.title}
            </h2>
            {deck.summary && <p className="panel__summary">{deck.summary}</p>}
          </div>
          <button type="button" className="panel__close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="panel__dots" aria-hidden="true">
          {deck.cards.map((item, position) => (
            <i
              key={item.id}
              className={[
                'panel__dot',
                progress[item.id] ? `panel__dot--${progress[item.id]}` : '',
                position === index ? 'panel__dot--current' : '',
              ].join(' ')}
            />
          ))}
        </div>

        <div className={fixing === card.id ? 'panel__stage panel__stage--fixing' : 'panel__stage'} key={card.id}>
          <div className="panel__card-tools">
            <button type="button" className="panel__fix" onClick={fix} disabled={fixing !== null}>
              {fixing === card.id ? 'Rewriting this card…' : 'Card looks wrong? Fix it'}
            </button>
          </div>
          {askSureness && (
            <ConfidencePicker value={sureness} onChange={(value) => setConfidence((current) => ({ ...current, [card.id]: value }))} />
          )}
          {card.type === 'flashcard' && (
            <Flashcard
              card={card}
              flipped={flipped}
              graded={answer === undefined ? undefined : answer === true}
              onFlip={() => setFlipped((value) => !value)}
              onGrade={choose}
            />
          )}
          {card.type === 'mcq' && (
            <Choices
              prompt={card.question}
              choices={card.options.map((option, position) => ({ label: option, key: String(position + 1) }))}
              correctIndex={card.answerIndex}
              picked={typeof answer === 'number' ? answer : undefined}
              explanation={card.explanation}
              onPick={choose}
            />
          )}
          {card.type === 'truefalse' && (
            <Choices
              prompt={card.statement}
              choices={TRUE_FALSE}
              correctIndex={card.answer ? 0 : 1}
              picked={typeof answer === 'boolean' ? (answer ? 0 : 1) : undefined}
              explanation={card.explanation}
              onPick={(position) => choose(position === 0)}
            />
          )}
          {confidentlyWrong && (
            <p className="confident-miss">
              You were certain, so this one goes to the front of your review. Confident mistakes are the ones most worth fixing.
            </p>
          )}
          {grounding && (
            <Source quote={card.source} grounding={grounding[card.id]} revealed={answer !== undefined || flipped} />
          )}
        </div>

        <footer className="panel__foot">
          <button type="button" className="btn" onClick={() => go(-1)} disabled={isFirst}>
            <span aria-hidden="true">←</span> Previous
          </button>
          <button type="button" className="btn btn--primary" onClick={() => (isLast ? close() : go(1))}>
            {isLast ? 'Done' : 'Next'} <span aria-hidden="true">→</span>
          </button>
        </footer>

        <p className="panel__keys">{keyHint(card)}</p>
      </div>
    </div>
  )
}

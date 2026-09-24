import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { isCorrect, type Answer } from '../lib/progress'
import type { Card, TopicNode } from '../lib/schema'
import type { Progress } from '../lib/tree'
import { Choices } from './Choices'
import { Flashcard } from './Flashcard'
import './TopicPanel.css'

type Props = {
  node: TopicNode
  progress: Progress
  onAnswer: (cardId: string, correct: boolean) => void
  onClose: () => void
}

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const TRUE_FALSE = [
  { label: 'True', key: 'T' },
  { label: 'False', key: 'F' },
]

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

export function TopicPanel({ node, progress, onAnswer, onClose }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [closing, setClosing] = useState(false)

  const card = node.cards[index]
  const answer = answers[card.id]
  const isFirst = index === 0
  const isLast = index === node.cards.length - 1

  function go(step: number) {
    const next = index + step
    if (next < 0 || next >= node.cards.length) return
    setIndex(next)
    setFlipped(false)
  }

  function close() {
    if (calm()) onClose()
    else setClosing(true)
  }

  function choose(value: Answer) {
    if (answers[card.id] !== undefined) return
    setAnswers((current) => ({ ...current, [card.id]: value }))
    onAnswer(card.id, isCorrect(card, value))
  }

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()

    return () => {
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
              Card {index + 1} of {node.cards.length}
            </p>
            <h2 id={titleId} className="panel__title">
              {node.label}
            </h2>
            {node.summary && <p className="panel__summary">{node.summary}</p>}
          </div>
          <button type="button" className="panel__close" onClick={close} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="panel__dots" aria-hidden="true">
          {node.cards.map((item, position) => (
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

        <div className="panel__stage" key={card.id}>
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

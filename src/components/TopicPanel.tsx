import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Card, TopicNode } from '../lib/schema'
import { Flashcard } from './Flashcard'
import './TopicPanel.css'

type Props = {
  node: TopicNode
  onClose: () => void
}

const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function QuestionPreview({ card }: { card: Card }) {
  if (card.type === 'mcq') {
    return (
      <div className="question">
        <p className="question__text">{card.question}</p>
        <ol className="question__options">
          {card.options.map((option) => (
            <li key={option}>{option}</li>
          ))}
        </ol>
      </div>
    )
  }
  if (card.type === 'truefalse') {
    return (
      <div className="question">
        <p className="question__text">{card.statement}</p>
        <ol className="question__options">
          <li>True</li>
          <li>False</li>
        </ol>
      </div>
    )
  }
  return null
}

export function TopicPanel({ node, onClose }: Props) {
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [closing, setClosing] = useState(false)

  const card = node.cards[index]
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

    if (event.key === 'Escape') {
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
            <i key={item.id} className={position === index ? 'panel__dot panel__dot--current' : 'panel__dot'} />
          ))}
        </div>

        <div className="panel__stage" key={card.id}>
          {card.type === 'flashcard' ? (
            <Flashcard card={card} flipped={flipped} onFlip={() => setFlipped((value) => !value)} />
          ) : (
            <QuestionPreview card={card} />
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

        <p className="panel__keys">Space flip · ← → move · Esc close</p>
      </div>
    </div>
  )
}

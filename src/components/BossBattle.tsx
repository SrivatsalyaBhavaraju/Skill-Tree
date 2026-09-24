import { useEffect, useId, useState, type KeyboardEvent } from 'react'
import { useDialog } from '../hooks/useDialog'
import { formatTime, passMark, SECONDS_PER_QUESTION, type BossQuestion } from '../lib/boss'
import { Choices } from './Choices'
import './BossBattle.css'

type Props = {
  questions: BossQuestion[]
  onPass: (score: number, total: number) => void
  onClose: () => void
}

type Phase = 'intro' | 'quiz' | 'result'

const TRUE_FALSE = [
  { label: 'True', key: 'T' },
  { label: 'False', key: 'F' },
]

function choicesFor(question: BossQuestion) {
  const { card } = question
  return card.type === 'mcq'
    ? card.options.map((option, index) => ({ label: option, key: String(index + 1) }))
    : TRUE_FALSE
}

function correctIndex(question: BossQuestion): number {
  const { card } = question
  return card.type === 'mcq' ? card.answerIndex : card.answer ? 0 : 1
}

function keyToChoice(question: BossQuestion, key: string): number | null {
  if (question.card.type === 'truefalse') {
    if (key.toLowerCase() === 't' || key === '1') return 0
    if (key.toLowerCase() === 'f' || key === '2') return 1
    return null
  }
  const index = Number(key) - 1
  return Number.isInteger(index) && index >= 0 && index < question.card.options.length ? index : null
}

export function BossBattle({ questions, onPass, onClose }: Props) {
  const titleId = useId()
  const { dialog, trapTab } = useDialog<HTMLDivElement>()
  const [phase, setPhase] = useState<Phase>('intro')
  const [index, setIndex] = useState(0)
  const [picks, setPicks] = useState<Record<number, number>>({})
  const [deadline, setDeadline] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const total = questions.length
  const limit = total * SECONDS_PER_QUESTION
  const needed = passMark(total)
  const question = questions[index]
  const picked = picks[index]
  const remaining = Math.max(0, (deadline - now) / 1000)
  const score = questions.filter((item, position) => picks[position] === correctIndex(item)).length
  const passed = score >= needed

  function start() {
    setPicks({})
    setIndex(0)
    setDeadline(Date.now() + limit * 1000)
    setNow(Date.now())
    setPhase('quiz')
  }

  function finish(finalPicks: Record<number, number>) {
    setPhase('result')
    const finalScore = questions.filter((item, position) => finalPicks[position] === correctIndex(item)).length
    if (finalScore >= needed) onPass(finalScore, total)
  }

  function pick(choice: number) {
    if (phase !== 'quiz' || picked !== undefined) return
    setPicks((current) => ({ ...current, [index]: choice }))
  }

  function next() {
    if (index === total - 1) finish(picks)
    else setIndex(index + 1)
  }

  useEffect(() => {
    if (phase !== 'quiz') return
    const timer = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase === 'quiz' && now >= deadline) finish(picks)
  }, [phase, now, deadline, picks])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (trapTab(event) || phase !== 'quiz') return

    const choice = keyToChoice(question, event.key)
    if (choice !== null && picked === undefined) {
      event.preventDefault()
      pick(choice)
    } else if ((event.key === 'Enter' || event.key === 'ArrowRight') && picked !== undefined) {
      event.preventDefault()
      next()
    }
  }

  return (
    <div className="panel-layer boss-layer">
      <div className="panel-layer__shade" onClick={onClose} />

      <div
        ref={dialog}
        className="boss"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="boss__head">
          <h2 id={titleId} className="boss__title">
            Final test
          </h2>
          <button type="button" className="panel__close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {phase === 'intro' && (
          <div className="boss__intro">
            <p className="boss__lead">Every topic is complete. One last check before the tree is yours.</p>
            <dl className="boss__facts">
              <div>
                <dt>Questions</dt>
                <dd>{total}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{formatTime(limit)}</dd>
              </div>
              <div>
                <dt>To pass</dt>
                <dd>
                  {needed} of {total}
                </dd>
              </div>
            </dl>
            <p className="boss__note">Questions come from every topic. The clock does not stop between questions.</p>
            <button type="button" className="btn btn--primary boss__start" onClick={start}>
              Start the test
            </button>
          </div>
        )}

        {phase === 'quiz' && (
          <div className="boss__quiz">
            <div className="boss__status">
              <span>
                Question {index + 1} of {total} · {question.topic}
              </span>
              <span className={remaining < 15 ? 'boss__clock boss__clock--low' : 'boss__clock'}>{formatTime(remaining)}</span>
            </div>
            <div className="boss__timer" aria-hidden="true">
              <i style={{ width: `${(remaining / limit) * 100}%` }} />
            </div>

            <div className="panel__stage" key={index}>
              <Choices
                prompt={question.card.type === 'mcq' ? question.card.question : question.card.statement}
                choices={choicesFor(question)}
                correctIndex={correctIndex(question)}
                picked={picked}
                explanation={question.card.explanation}
                onPick={pick}
              />
            </div>

            <footer className="panel__foot">
              <button type="button" className="btn btn--primary" onClick={next} disabled={picked === undefined}>
                {index === total - 1 ? 'Finish' : 'Next'} <span aria-hidden="true">→</span>
              </button>
            </footer>
          </div>
        )}

        {phase === 'result' && (
          <div className="boss__result" role="status">
            <p className={passed ? 'boss__verdict boss__verdict--pass' : 'boss__verdict'}>
              {passed ? 'Passed' : remaining === 0 ? 'Out of time' : 'Not yet'}
            </p>
            <p className="boss__score">
              {score}
              <span> / {total}</span>
            </p>
            <p className="boss__lead">
              {passed
                ? 'The whole tree is conquered. Nicely done.'
                : `You need ${needed} to pass. Review the ones below, then try again.`}
            </p>

            {score < total && (
              <ul className="boss__missed">
                {questions.map((item, position) =>
                  picks[position] === correctIndex(item) ? null : (
                    <li key={position}>
                      <span className="boss__missed-topic">{item.topic}</span>
                      <span>{item.card.type === 'mcq' ? item.card.question : item.card.statement}</span>
                      <strong>Answer: {choicesFor(item)[correctIndex(item)].label}</strong>
                    </li>
                  ),
                )}
              </ul>
            )}

            <div className="panel__foot">
              <button type="button" className="btn" onClick={start}>
                Try again
              </button>
              <button type="button" className="btn btn--primary" onClick={onClose}>
                Back to the tree
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

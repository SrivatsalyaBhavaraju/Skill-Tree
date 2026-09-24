import type { CSSProperties } from 'react'
import type { TopicStatus } from '../lib/tree'
import { LockIcon, PlayIcon } from './icons'

type Props = {
  status: TopicStatus
  text: string
  order: number
  onOpen: () => void
  tileRef: (element: HTMLButtonElement | null) => void
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3M8.5 20h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FinalTile({ status, text, order, onOpen, tileRef }: Props) {
  return (
    <button
      ref={tileRef}
      type="button"
      className={`topic topic--${status} topic--final`}
      style={{ '--order': order } as CSSProperties}
      onClick={onOpen}
      aria-disabled={status === 'locked'}
      aria-label={`Final test. ${text}`}
    >
      <span className="topic__icon">{status === 'locked' ? <LockIcon /> : status === 'done' ? <TrophyIcon /> : <PlayIcon />}</span>
      <span className="topic__body">
        <span className="topic__title">Final test</span>
        <span className="topic__status">{text}</span>
      </span>
    </button>
  )
}

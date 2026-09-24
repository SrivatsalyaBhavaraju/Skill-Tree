import type { CSSProperties } from 'react'
import type { TopicNode } from '../lib/schema'
import type { TopicStatus } from '../lib/tree'
import { StatusIcon } from './icons'

type Props = {
  node: TopicNode
  status: TopicStatus
  text: string
  correct: number
  missed: number
  isNext: boolean
  order: number
  onOpen: () => void
  tileRef: (element: HTMLButtonElement | null) => void
}

export function TopicTile({ node, status, text, correct, missed, isNext, order, onOpen, tileRef }: Props) {
  const total = node.cards.length

  return (
    <button
      ref={tileRef}
      type="button"
      className={`topic topic--${status}`}
      style={{ '--order': order } as CSSProperties}
      onClick={onOpen}
      aria-disabled={status === 'locked'}
      aria-label={`${node.label}. ${text}${isNext ? '. Up next' : ''}`}
    >
      {isNext && <span className="topic__badge">Up next</span>}
      <span className="topic__icon">
        <StatusIcon status={status} />
      </span>
      <span className="topic__body">
        <span className="topic__title">{node.label}</span>
        <span className="topic__status">{text}</span>
        <span className="topic__bar">
          <i className="topic__bar-correct" style={{ width: `${(correct / total) * 100}%` }} />
          <i className="topic__bar-missed" style={{ width: `${(missed / total) * 100}%` }} />
        </span>
      </span>
    </button>
  )
}

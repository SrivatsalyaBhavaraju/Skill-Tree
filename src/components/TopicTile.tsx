import type { CSSProperties, MouseEvent } from 'react'
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

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (status === 'locked' && !calm) {
      event.currentTarget.animate(
        [{ translate: '0' }, { translate: '-6px' }, { translate: '5px' }, { translate: '-3px' }, { translate: '0' }],
        { duration: 420, easing: 'ease-out' },
      )
    }
    onOpen()
  }

  return (
    <button
      ref={tileRef}
      type="button"
      className={`topic topic--${status}`}
      style={{ '--order': order } as CSSProperties}
      onClick={handleClick}
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

import { useMemo, useRef } from 'react'
import type { SkillTree } from '../lib/schema'
import { countCards, isComplete, levelsOf, nextTopic, statusText, summarize, topicStatus, type Progress } from '../lib/tree'
import { Connectors, type Edge } from './Connectors'
import { TopicTile } from './TopicTile'
import './TreeView.css'

type Props = {
  tree: SkillTree
  progress: Progress
  fromNotes: boolean
  onOpenTopic: (id: string) => void
  onReview: () => void
}

function levelName(index: number): string {
  return index === 0 ? 'Start' : `Level ${index + 1}`
}

export function TreeView({ tree, progress, fromNotes, onOpenTopic, onReview }: Props) {
  const board = useRef<HTMLElement>(null)
  const tiles = useRef(new Map<string, HTMLElement>())

  const levels = useMemo(() => levelsOf(tree.nodes), [tree.nodes])
  const summary = summarize(tree.nodes, progress)
  const next = nextTopic(tree.nodes, progress)

  const edges = useMemo<Edge[]>(
    () =>
      tree.nodes.flatMap((node) =>
        node.prerequisites.map((id) => {
          const prerequisite = tree.nodes.find((other) => other.id === id)
          const lit =
            prerequisite !== undefined &&
            isComplete(prerequisite, progress) &&
            topicStatus(node, tree.nodes, progress) !== 'locked'
          return { from: id, to: node.id, lit }
        }),
      ),
    [tree.nodes, progress],
  )

  let order = 0

  return (
    <div className="tree">
      <header className="tree__head">
        <p className="tree__meta reveal">
          <span>{fromNotes ? 'From your notes' : 'From a topic'}</span>
          <span>{summary.topics} topics</span>
          <span>{summary.cards} cards</span>
        </p>
        <h1 className="tree__title reveal reveal--2">{tree.title}</h1>
      </header>

      <section className="tree__summary reveal reveal--3" aria-label="Progress">
        <div>
          <p className="tree__summary-line">
            <strong>
              {summary.topicsDone} of {summary.topics} topics complete
            </strong>
            <span>{summary.cards - summary.correct} cards left</span>
          </p>
          <div className="tree__bar" aria-hidden="true">
            <i className="tree__bar-correct" style={{ width: `${(summary.correct / summary.cards) * 100}%` }} />
            <i className="tree__bar-missed" style={{ width: `${(summary.missed / summary.cards) * 100}%` }} />
          </div>
        </div>

        <div className="tree__actions">
          <button type="button" className="btn" onClick={onReview} disabled={summary.missed === 0}>
            Review mistakes
            {summary.missed > 0 && <span className="tree__count">{summary.missed}</span>}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => next && onOpenTopic(next.id)}
            disabled={next === null}
          >
            {next ? `Continue: ${next.label}` : 'All topics complete'}
            {next && <span aria-hidden="true">→</span>}
          </button>
        </div>
      </section>

      <h2 className="tree__path-title">Your path</h2>

      <section className="tree__board" ref={board} aria-label="Skill tree">
        <Connectors edges={edges} board={board} tiles={tiles} />

        {levels.map((row, index) => (
          <div className="tree__level" key={index}>
            <p className="tree__level-name">{levelName(index)}</p>
            <div className="tree__level-row">
              {row.map((node) => {
                const counts = countCards(node, progress)
                return (
                  <TopicTile
                    key={node.id}
                    node={node}
                    status={topicStatus(node, tree.nodes, progress)}
                    text={statusText(node, tree.nodes, progress)}
                    correct={counts.correct}
                    missed={counts.missed}
                    isNext={next?.id === node.id}
                    order={order++}
                    onOpen={() => onOpenTopic(node.id)}
                    tileRef={(element) => {
                      if (element) tiles.current.set(node.id, element)
                      else tiles.current.delete(node.id)
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { passMark } from '../lib/boss'
import { celebrate, unlock } from '../lib/effects'
import type { Grounding } from '../lib/grounding'
import type { SkillTree } from '../lib/schema'
import {
  countCards,
  isComplete,
  levelsOf,
  nextTopic,
  statusText,
  summarize,
  topicStatus,
  type Progress,
  type TopicStatus,
} from '../lib/tree'
import type { RepairReport as Report } from '../lib/validate'
import { Connectors, type Edge } from './Connectors'
import { FinalTile } from './FinalTile'
import { RepairReport } from './RepairReport'
import { TopicTile } from './TopicTile'
import './TreeView.css'

type Props = {
  tree: SkillTree
  progress: Progress
  paused: boolean
  fromNotes: boolean
  report: Report
  repaired: boolean
  grounding: Record<string, Grounding> | null
  finalQuestions: number
  finalScore: { score: number; total: number } | null
  onOpenFinal: () => void
  onOpenTopic: (id: string) => void
  onReview: () => void
}

const FINAL_ID = '__final__'

function finalText(status: TopicStatus, left: number, questions: number, score: { score: number; total: number } | null) {
  if (status === 'locked') return `Locked · ${left} topic${left === 1 ? '' : 's'} to go`
  if (status === 'done' && score) return `Passed · ${score.score} of ${score.total}`
  return `Timed · ${questions} questions · pass with ${passMark(questions)}`
}

function levelName(index: number): string {
  return index === 0 ? 'Start' : `Level ${index + 1}`
}

export function TreeView({
  tree,
  progress: latest,
  paused,
  fromNotes,
  report,
  repaired,
  grounding,
  finalQuestions,
  finalScore: latestScore,
  onOpenFinal,
  onOpenTopic,
  onReview,
}: Props) {
  const board = useRef<HTMLElement>(null)
  const tiles = useRef(new Map<string, HTMLElement>())
  const [progress, setProgress] = useState(latest)
  const [finalScore, setFinalScore] = useState(latestScore)
  if (!paused && progress !== latest) setProgress(latest)
  if (!paused && finalScore !== latestScore) setFinalScore(latestScore)

  const allDone = tree.nodes.every((node) => isComplete(node, progress))
  const hasFinal = finalQuestions > 0
  const finalStatus: TopicStatus = !allDone ? 'locked' : finalScore ? 'done' : 'ready'

  const statuses = useMemo(
    () =>
      new Map<string, TopicStatus>([
        ...tree.nodes.map((node) => [node.id, topicStatus(node, tree.nodes, progress)] as const),
        ...(hasFinal ? [[FINAL_ID, finalStatus] as const] : []),
      ]),
    [tree.nodes, progress, hasFinal, finalStatus],
  )
  const previous = useRef(statuses)

  useEffect(() => {
    const before = previous.current
    previous.current = statuses
    if (before === statuses) return

    const timers: number[] = []
    for (const [id, status] of statuses) {
      const tile = tiles.current.get(id)
      const was = before.get(id)
      if (!tile || was === status) continue

      if (status === 'done') celebrate(tile)
      else if (was === 'locked') timers.push(window.setTimeout(() => unlock(tile), 700))
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [statuses])

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
            statuses.get(node.id) !== 'locked'
          return { from: id, to: node.id, lit }
        }),
      ).concat(
        hasFinal
          ? tree.nodes
              .filter((node) => !tree.nodes.some((other) => other.prerequisites.includes(node.id)))
              .map((node) => ({ from: node.id, to: FINAL_ID, lit: allDone }))
          : [],
      ),
    [tree.nodes, progress, statuses, hasFinal, allDone],
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
        <RepairReport report={report} repaired={repaired} grounding={grounding} />
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
          {next || finalStatus !== 'ready' ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => next && onOpenTopic(next.id)}
              disabled={next === null}
            >
              {next ? `Continue: ${next.label}` : finalStatus === 'done' ? 'Tree complete' : 'All topics complete'}
              {next && <span aria-hidden="true">→</span>}
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={onOpenFinal}>
              Take the final test <span aria-hidden="true">→</span>
            </button>
          )}
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
                    status={statuses.get(node.id) ?? 'locked'}
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

        {hasFinal && (
          <div className="tree__level">
            <p className="tree__level-name">Final</p>
            <div className="tree__level-row">
              <FinalTile
                status={finalStatus}
                text={finalText(finalStatus, tree.nodes.length - summary.topicsDone, finalQuestions, finalScore)}
                order={order++}
                onOpen={onOpenFinal}
                tileRef={(element) => {
                  if (element) tiles.current.set(FINAL_ID, element)
                  else tiles.current.delete(FINAL_ID)
                }}
              />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

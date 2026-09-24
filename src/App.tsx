import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Backdrop } from './components/Backdrop'
import { ChaosPanel } from './components/ChaosPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ErrorCard } from './components/ErrorCard'
import { Examples } from './components/Examples'
import { InputPanel } from './components/InputPanel'
import { LoadingCard } from './components/LoadingCard'
import { Toast, type Notice } from './components/Toast'
import { TopicPanel } from './components/TopicPanel'
import { TreeView } from './components/TreeView'
import { useGenerateTree } from './hooks/useGenerateTree'
import { requestCardFix } from './lib/api'
import { pickBackground } from './lib/background'
import type { ChaosScenario } from './lib/chaos'
import { missedCardIds, reviewDeck, topicDeck } from './lib/deck'
import { ERROR_COPY } from './lib/errorMessages'
import { checkGrounding } from './lib/grounding'
import { isNotes } from './lib/input'
import { progressReducer, type Confidence } from './lib/progress'
import type { Card } from './lib/schema'
import { applyFixes, isComplete, statusText, topicStatus } from './lib/tree'

const CHAOS_ENABLED = new URLSearchParams(window.location.search).has('chaos')

function App() {
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(true)
  const [opened, setOpened] = useState<{ topic: string } | { review: string[] } | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [progress, dispatch] = useReducer(progressReducer, {})
  const [chaos, setChaos] = useState<ChaosScenario>('normal')
  const [fixes, setFixes] = useState<Record<string, Card>>({})
  const { state, generate, cancel } = useGenerateTree()

  const tree = state.status === 'success' && !editing ? state : null
  const shown = useMemo(() => (tree ? applyFixes(tree.tree, fixes) : null), [tree, fixes])
  const latestState = useRef(state)

  useEffect(() => {
    latestState.current = state
  }, [state])
  const background = tree ? pickBackground(tree.input, tree.tree.subject) : pickBackground(text)

  useEffect(() => {
    document.documentElement.dataset.bg = background
  }, [background])

  const clearNotice = useCallback(() => setNotice(null), [])
  const grounding = useMemo(
    () => (tree && shown && isNotes(tree.input) ? checkGrounding(shown, tree.input) : null),
    [tree, shown],
  )
  const deck = openDeck()

  function openDeck() {
    if (!shown || !opened) return null
    if ('review' in opened) return reviewDeck(shown.nodes, opened.review)
    const node = shown.nodes.find((item) => item.id === opened.topic)
    return node ? topicDeck(node) : null
  }

  function build(input: string) {
    setEditing(false)
    setOpened(null)
    setFixes({})
    dispatch({ type: 'reset' })
    generate(input, CHAOS_ENABLED ? chaos : undefined)
  }

  function startOver() {
    setOpened(null)
    setEditing(true)
  }

  function openTopic(id: string) {
    if (!shown) return
    const nodes = shown.nodes
    const node = nodes.find((item) => item.id === id)
    if (!node) return

    if (topicStatus(node, nodes, progress) === 'locked') {
      setNotice({ id: Date.now(), text: `${node.label}: ${statusText(node, nodes, progress)}` })
    } else {
      setOpened({ topic: id })
    }
  }

  function openReview() {
    if (!shown) return
    const ids = missedCardIds(shown.nodes, progress)
    if (ids.length > 0) setOpened({ review: ids })
  }

  function answer(cardId: string, correct: boolean, confidence: Confidence | undefined) {
    if (!shown) return
    const nodes = shown.nodes
    const action = { type: 'answer', cardId, correct, confidence } as const
    const next = progressReducer(progress, action)
    dispatch(action)

    const finished = nodes.find((node) => !isComplete(node, progress) && isComplete(node, next))
    if (!finished) return

    const unlocked = nodes.filter(
      (node) => topicStatus(node, nodes, progress) === 'locked' && topicStatus(node, nodes, next) !== 'locked',
    )
    const extra = unlocked.length > 0 ? ` Unlocked: ${unlocked.map((node) => node.label).join(', ')}.` : ''
    setNotice({ id: Date.now(), text: `${finished.label} complete.${extra}` })
  }

  async function fixCard(cardId: string): Promise<boolean> {
    if (!tree || !shown) return false
    const node = shown.nodes.find((item) => item.cards.some((card) => card.id === cardId))
    const card = node?.cards.find((item) => item.id === cardId)
    if (!node || !card) return false

    const result = await requestCardFix(node, card, isNotes(tree.input) ? tree.input : null)
    if (latestState.current !== tree) return false

    if (!result.ok) {
      setNotice({ id: Date.now(), text: `Couldn’t fix this card: ${ERROR_COPY[result.kind].title}.` })
      return false
    }

    setFixes((current) => ({ ...current, [cardId]: { ...result.card, id: cardId } }))
    dispatch({ type: 'forget', cardId })
    setNotice({ id: Date.now(), text: 'Card rewritten and checked. Your progress on it was reset.' })
    return true
  }

  return (
    <>
      <Backdrop kind={background} />

      <main className="app">
        <header className="app__topbar">
          <div className="app__wordmark">
            <svg viewBox="0 0 22 22" aria-hidden="true">
              <path d="M11 19V11M11 11L5 5M11 11l6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.5" />
              <circle cx="11" cy="19" r="2.4" fill="var(--done)" />
              <circle cx="5" cy="5" r="2.4" fill="var(--ready)" />
              <circle cx="17" cy="5" r="2.4" fill="var(--review)" />
            </svg>
            Skill Tree
          </div>
          {tree && (
            <button type="button" className="btn" onClick={() => setEditing(true)}>
              New tree
            </button>
          )}
        </header>

        {tree ? (
          <ErrorBoundary onReset={startOver}>
            <TreeView
              key={tree.tree.title + tree.input}
              tree={shown ?? tree.tree}
              progress={progress}
              paused={deck !== null}
              fromNotes={isNotes(tree.input)}
              report={tree.report}
              repaired={tree.repaired}
              grounding={grounding}
              onOpenTopic={openTopic}
              onReview={openReview}
            />
          </ErrorBoundary>
        ) : (
          <>
            <section className="app__hero">
              <h1 className="reveal">Study it like a skill tree.</h1>
              <p className="reveal reveal--2">
                Paste your notes or name a topic. Every concept becomes a step you unlock by answering its cards.
              </p>
            </section>

            <div className="reveal reveal--3">
              <InputPanel value={text} onChange={setText} onSubmit={() => build(text)} busy={state.status === 'loading'} />
            </div>

            {state.status === 'idle' && text.trim() === '' && <Examples onPick={setText} />}

            <section className="app__result">
              {state.status === 'loading' && <LoadingCard onCancel={cancel} />}

              {state.status === 'error' && (
                <ErrorCard kind={state.kind} message={state.message} onRetry={() => build(state.input)} />
              )}

              {state.status === 'success' && editing && (
                <button type="button" className="btn" onClick={() => setEditing(false)}>
                  Back to “{state.tree.title}”
                </button>
              )}
            </section>
          </>
        )}
      </main>

      {deck && (
        <ErrorBoundary onReset={startOver}>
          <TopicPanel
            key={deck.id}
            deck={deck}
            progress={progress}
            grounding={grounding}
            onAnswer={answer}
            onFix={fixCard}
            onClose={() => setOpened(null)}
          />
        </ErrorBoundary>
      )}
      <Toast notice={notice} onDone={clearNotice} />
      {CHAOS_ENABLED && <ChaosPanel value={chaos} onChange={setChaos} />}
    </>
  )
}

export default App

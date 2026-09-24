import { useCallback, useEffect, useReducer, useState } from 'react'
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
import { pickBackground } from './lib/background'
import type { ChaosScenario } from './lib/chaos'
import { missedCardIds, reviewDeck, topicDeck } from './lib/deck'
import { isNotes } from './lib/input'
import { progressReducer } from './lib/progress'
import { isComplete, statusText, topicStatus } from './lib/tree'

const CHAOS_ENABLED = new URLSearchParams(window.location.search).has('chaos')

function App() {
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(true)
  const [opened, setOpened] = useState<{ topic: string } | { review: string[] } | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [progress, dispatch] = useReducer(progressReducer, {})
  const [chaos, setChaos] = useState<ChaosScenario>('normal')
  const { state, generate, cancel } = useGenerateTree()

  const tree = state.status === 'success' && !editing ? state : null
  const background = tree ? pickBackground(tree.input, tree.tree.subject) : pickBackground(text)

  useEffect(() => {
    document.documentElement.dataset.bg = background
  }, [background])

  const clearNotice = useCallback(() => setNotice(null), [])
  const deck = openDeck()

  function openDeck() {
    if (!tree || !opened) return null
    if ('review' in opened) return reviewDeck(tree.tree.nodes, opened.review)
    const node = tree.tree.nodes.find((item) => item.id === opened.topic)
    return node ? topicDeck(node) : null
  }

  function build(input: string) {
    setEditing(false)
    setOpened(null)
    dispatch({ type: 'reset' })
    generate(input, CHAOS_ENABLED ? chaos : undefined)
  }

  function startOver() {
    setOpened(null)
    setEditing(true)
  }

  function openTopic(id: string) {
    if (!tree) return
    const nodes = tree.tree.nodes
    const node = nodes.find((item) => item.id === id)
    if (!node) return

    if (topicStatus(node, nodes, progress) === 'locked') {
      setNotice({ id: Date.now(), text: `${node.label}: ${statusText(node, nodes, progress)}` })
    } else {
      setOpened({ topic: id })
    }
  }

  function openReview() {
    if (!tree) return
    const ids = missedCardIds(tree.tree.nodes, progress)
    if (ids.length > 0) setOpened({ review: ids })
  }

  function answer(cardId: string, correct: boolean) {
    if (!tree) return
    const nodes = tree.tree.nodes
    const next = progressReducer(progress, { type: 'answer', cardId, correct })
    dispatch({ type: 'answer', cardId, correct })

    const finished = nodes.find((node) => !isComplete(node, progress) && isComplete(node, next))
    if (!finished) return

    const unlocked = nodes.filter(
      (node) => topicStatus(node, nodes, progress) === 'locked' && topicStatus(node, nodes, next) !== 'locked',
    )
    const extra = unlocked.length > 0 ? ` Unlocked: ${unlocked.map((node) => node.label).join(', ')}.` : ''
    setNotice({ id: Date.now(), text: `${finished.label} complete.${extra}` })
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
              tree={tree.tree}
              progress={progress}
              paused={deck !== null}
              fromNotes={isNotes(tree.input)}
              report={tree.report}
              repaired={tree.repaired}
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
          <TopicPanel key={deck.id} deck={deck} progress={progress} onAnswer={answer} onClose={() => setOpened(null)} />
        </ErrorBoundary>
      )}
      <Toast notice={notice} onDone={clearNotice} />
      {CHAOS_ENABLED && <ChaosPanel value={chaos} onChange={setChaos} />}
    </>
  )
}

export default App

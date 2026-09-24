import { useCallback, useEffect, useState } from 'react'
import { Backdrop } from './components/Backdrop'
import { InputPanel } from './components/InputPanel'
import { Toast, type Notice } from './components/Toast'
import { TopicPanel } from './components/TopicPanel'
import { TreeView } from './components/TreeView'
import { useGenerateTree } from './hooks/useGenerateTree'
import { pickBackground } from './lib/background'
import { isNotes } from './lib/input'
import { statusText, topicStatus, type Progress } from './lib/tree'

const NO_PROGRESS: Progress = {}

function App() {
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const { state, generate } = useGenerateTree()

  const tree = state.status === 'success' && !editing ? state : null
  const background = tree ? pickBackground(tree.input, tree.tree.subject) : pickBackground(text)

  useEffect(() => {
    document.documentElement.dataset.bg = background
  }, [background])

  const clearNotice = useCallback(() => setNotice(null), [])
  const openNode = tree?.tree.nodes.find((node) => node.id === openId) ?? null

  function build() {
    setEditing(false)
    setOpenId(null)
    generate(text)
  }

  function openTopic(id: string) {
    if (!tree) return
    const nodes = tree.tree.nodes
    const node = nodes.find((item) => item.id === id)
    if (!node) return

    if (topicStatus(node, nodes, NO_PROGRESS) === 'locked') {
      setNotice({ id: Date.now(), text: `${node.label}: ${statusText(node, nodes, NO_PROGRESS)}` })
    } else {
      setOpenId(id)
    }
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
          <TreeView
            key={tree.tree.title + tree.input}
            tree={tree.tree}
            progress={NO_PROGRESS}
            fromNotes={isNotes(tree.input)}
            onOpenTopic={openTopic}
            onReview={() => {}}
          />
        ) : (
          <>
            <section className="app__hero">
              <h1 className="reveal">Study it like a skill tree.</h1>
              <p className="reveal reveal--2">
                Paste your notes or name a topic. Every concept becomes a step you unlock by answering its cards.
              </p>
            </section>

            <div className="reveal reveal--3">
              <InputPanel value={text} onChange={setText} onSubmit={build} busy={state.status === 'loading'} />
            </div>

            <section className="app__result" aria-live="polite">
              {state.status === 'loading' && <p>Building your tree…</p>}

              {state.status === 'error' && (
                <p className="app__error">
                  {state.message}{' '}
                  <button type="button" className="btn" onClick={build}>
                    Try again
                  </button>
                </p>
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

      {openNode && <TopicPanel key={openNode.id} node={openNode} onClose={() => setOpenId(null)} />}
      <Toast notice={notice} onDone={clearNotice} />
    </>
  )
}

export default App

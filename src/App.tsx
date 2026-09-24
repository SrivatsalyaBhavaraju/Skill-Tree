import { useEffect, useState } from 'react'
import { Backdrop } from './components/Backdrop'
import { InputPanel } from './components/InputPanel'
import { useGenerateTree } from './hooks/useGenerateTree'
import { pickBackground } from './lib/background'

function App() {
  const [text, setText] = useState('')
  const { state, generate } = useGenerateTree()
  const background =
    state.status === 'success' ? pickBackground(state.input, state.tree.subject) : pickBackground(text)

  useEffect(() => {
    document.documentElement.dataset.bg = background
  }, [background])

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
        </header>

        <section className="app__hero">
          <h1 className="reveal">Study it like a skill tree.</h1>
          <p className="reveal reveal--2">
            Paste your notes or name a topic. Every concept becomes a step you unlock by answering its cards.
          </p>
        </section>

        <div className="reveal reveal--3">
          <InputPanel
            value={text}
            onChange={setText}
            onSubmit={() => generate(text)}
            busy={state.status === 'loading'}
          />
        </div>

        <section className="app__result" aria-live="polite">
          {state.status === 'loading' && <p>Building your tree…</p>}

          {state.status === 'error' && (
            <p className="app__error">
              {state.message}{' '}
              <button className="btn" onClick={() => generate(text)}>
                Try again
              </button>
            </p>
          )}

          {state.status === 'success' && (
            <div>
              <h2>{state.tree.title}</h2>
              <ol>
                {state.tree.nodes.map((node) => (
                  <li key={node.id}>
                    {node.label} · {node.cards.length} cards
                    {node.prerequisites.length > 0 && ` · needs ${node.prerequisites.join(', ')}`}
                  </li>
                ))}
              </ol>
              <p>
                Repair report: {state.report.fixed.length} fixed, {state.report.dropped.length} dropped
              </p>
            </div>
          )}
        </section>
      </main>
    </>
  )
}

export default App

import { useState } from 'react'
import { InputPanel } from './components/InputPanel'

function App() {
  const [text, setText] = useState('')

  return (
    <main className="app">
      <header className="app__header">
        <h1>Skill Tree</h1>
        <p>Paste your notes, get a skill tree you conquer.</p>
      </header>

      <InputPanel value={text} onChange={setText} onSubmit={() => {}} busy={false} />
    </main>
  )
}

export default App

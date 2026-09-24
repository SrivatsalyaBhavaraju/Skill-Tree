import { useId, type FormEvent, type KeyboardEvent } from 'react'
import { checkInput, isNotes, MAX_INPUT_CHARS } from '../lib/input'
import './InputPanel.css'

type Props = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  busy: boolean
}

const WARN_AT = MAX_INPUT_CHARS * 0.9

function ModeHint({ value }: { value: string }) {
  if (value.trim() === '') {
    return <>Paste notes to get cards quoted from your own text, or type a topic.</>
  }
  if (isNotes(value)) {
    return (
      <>
        <span className="input-panel__mode input-panel__mode--notes">Notes</span>
        Every card will quote your notes, and each quote gets checked.
      </>
    )
  }
  return (
    <>
      <span className="input-panel__mode input-panel__mode--topic">Topic</span>
      Cards come from general knowledge.
    </>
  )
}

export function InputPanel({ value, onChange, onSubmit, busy }: Props) {
  const id = useId()
  const length = value.trim().length
  const problem = checkInput(value)
  const canSubmit = problem === null && !busy

  function submit() {
    if (canSubmit) onSubmit()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className="input-panel" onSubmit={handleSubmit}>
      <label className="input-panel__label" htmlFor={id}>
        Your notes or a topic
      </label>
      <textarea
        id={id}
        className="input-panel__field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={6}
        placeholder="Paste lecture notes, or type something like “How vaccines work”"
        aria-describedby={`${id}-hint`}
        spellCheck
      />

      <div className="input-panel__footer">
        <p id={`${id}-hint`} className="input-panel__hint">
          <ModeHint value={value} />
        </p>

        <div className="input-panel__actions">
          <span className={length > WARN_AT ? 'input-panel__count input-panel__count--warn' : 'input-panel__count'}>
            {length.toLocaleString('en-US')} / {MAX_INPUT_CHARS.toLocaleString('en-US')}
          </span>
          <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
            {busy ? 'Building…' : 'Build my tree'}
            <span className="input-panel__kbd">Ctrl ↵</span>
          </button>
        </div>
      </div>

      {length > MAX_INPUT_CHARS && (
        <p className="input-panel__error" role="alert">
          {problem}
        </p>
      )}
    </form>
  )
}

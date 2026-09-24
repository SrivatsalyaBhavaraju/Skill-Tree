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

function modeHint(value: string): string {
  if (value.trim() === '') {
    return 'Paste notes to get cards quoted from your own text, or type a topic for cards from general knowledge.'
  }
  if (isNotes(value)) {
    return 'Notes mode: every card quotes your notes, and each quote is checked against them.'
  }
  return 'Topic mode: cards come from general knowledge, so there are no quotes to check.'
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
        Notes or topic
      </label>
      <textarea
        id={id}
        className="input-panel__field"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        rows={8}
        placeholder="Paste lecture notes, or type a topic like “How vaccines work”"
        aria-describedby={`${id}-hint`}
        spellCheck
      />

      <div className="input-panel__footer">
        <p id={`${id}-hint`} className="input-panel__hint">
          {modeHint(value)}
        </p>

        <div className="input-panel__actions">
          <span className={length > WARN_AT ? 'input-panel__count input-panel__count--warn' : 'input-panel__count'}>
            {length.toLocaleString('en-US')} / {MAX_INPUT_CHARS.toLocaleString('en-US')}
          </span>
          <button type="submit" className="input-panel__submit" disabled={!canSubmit}>
            {busy ? 'Building…' : 'Build tree'}
            <kbd className="input-panel__kbd">Ctrl ↵</kbd>
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

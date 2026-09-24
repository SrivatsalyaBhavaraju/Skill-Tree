import { useState } from 'react'
import { CHAOS_SCENARIOS, type ChaosScenario } from '../lib/chaos'
import './ChaosPanel.css'

type Props = {
  value: ChaosScenario
  onChange: (scenario: ChaosScenario) => void
}

const SCENARIOS = Object.entries(CHAOS_SCENARIOS) as [ChaosScenario, (typeof CHAOS_SCENARIOS)[ChaosScenario]][]

export function ChaosPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(true)

  return (
    <aside className="chaos" aria-label="Chaos Mode">
      <button type="button" className="chaos__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="chaos__badge">Chaos Mode</span>
        <span className="chaos__current">{CHAOS_SCENARIOS[value].label}</span>
        <span className="chaos__toggle">{open ? 'Hide' : 'Show'}</span>
      </button>

      {open && (
        <div className="chaos__body">
          <p className="chaos__note">
            The server answers with a saved bad output instead of calling Gemini. It still goes through the real
            pipeline.
          </p>
          <fieldset className="chaos__options">
            <legend className="sr-only">Scenario</legend>
            {SCENARIOS.map(([key, scenario]) => (
              <label key={key} className={key === value ? 'chaos__option chaos__option--on' : 'chaos__option'}>
                <input type="radio" name="chaos" value={key} checked={key === value} onChange={() => onChange(key)} />
                <span>
                  <strong>{scenario.label}</strong>
                  <small>{scenario.detail}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="chaos__note">
            Stale-response test: pick Slow and build, then pick Normal and build again. The slow answer is ignored.
          </p>
        </div>
      )}
    </aside>
  )
}

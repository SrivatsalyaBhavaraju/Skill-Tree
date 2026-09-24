import type { Confidence } from '../lib/progress'

const OPTIONS: { value: Confidence; label: string }[] = [
  { value: 'guess', label: 'Guessing' },
  { value: 'fair', label: 'Fairly sure' },
  { value: 'certain', label: 'Certain' },
]

type Props = {
  value: Confidence | undefined
  onChange: (value: Confidence) => void
}

export function ConfidencePicker({ value, onChange }: Props) {
  return (
    <div className="confidence" role="radiogroup" aria-label="How sure are you?">
      <span className="confidence__label">How sure are you?</span>
      <div className="confidence__options">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={value === option.value ? `confidence__option confidence__option--${option.value} is-on` : 'confidence__option'}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

import type { ErrorKind } from '../lib/errors'
import { ERROR_COPY } from '../lib/errorMessages'
import './ErrorCard.css'

type Props = {
  kind: ErrorKind
  message: string
  onRetry: () => void
}

export function ErrorCard({ kind, message, onRetry }: Props) {
  const copy = ERROR_COPY[kind]

  return (
    <div className="error-card" role="alert">
      <span className="error-card__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M12 7.5v6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="12" cy="17.2" r="1.5" fill="currentColor" />
        </svg>
      </span>

      <div className="error-card__body">
        <p className="error-card__title">{copy.title}</p>
        <p className="error-card__hint">{copy.hint}</p>

        <details className="error-card__details">
          <summary>Technical details</summary>
          <code>
            {kind}: {message}
          </code>
        </details>
      </div>

      {copy.canRetry && (
        <button type="button" className="btn btn--primary error-card__retry" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  )
}

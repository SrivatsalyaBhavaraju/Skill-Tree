import { useEffect, useState } from 'react'
import './LoadingCard.css'

type Props = {
  onCancel: () => void
}

function message(seconds: number): string {
  if (seconds < 5) return 'Building your tree…'
  if (seconds < 15) return 'Still working. Longer notes take a little more time.'
  return 'Almost there. The AI is slower than usual right now.'
}

export function LoadingCard({ onCancel }: Props) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 250)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="loading-card">
      <div className="loading-card__bar" aria-hidden="true">
        <i />
      </div>
      <div className="loading-card__row">
        <p className="loading-card__message" role="status">
          {message(seconds)}
        </p>
        <span className="loading-card__time" aria-hidden="true">
          {seconds}s
        </span>
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}

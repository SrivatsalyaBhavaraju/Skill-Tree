import { Component, type ReactNode } from 'react'
import './ErrorCard.css'

type Props = {
  children: ReactNode
  onReset: () => void
}

type State = {
  failed: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  reset = () => {
    this.setState({ failed: false })
    this.props.onReset()
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="error-card error-card--crash" role="alert">
        <span className="error-card__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M12 7.5v6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="12" cy="17.2" r="1.5" fill="currentColor" />
          </svg>
        </span>
        <div className="error-card__body">
          <p className="error-card__title">Something broke while showing this</p>
          <p className="error-card__hint">Your text is safe. Start over to go back to the input and build again.</p>
        </div>
        <button type="button" className="btn btn--primary error-card__retry" onClick={this.reset}>
          Start over
        </button>
      </div>
    )
  }
}

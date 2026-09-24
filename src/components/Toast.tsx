import { useEffect } from 'react'

export type Notice = {
  id: number
  text: string
}

type Props = {
  notice: Notice | null
  onDone: () => void
}

export function Toast({ notice, onDone }: Props) {
  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(onDone, 2800)
    return () => window.clearTimeout(timer)
  }, [notice, onDone])

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {notice && (
        <p key={notice.id} className="toast">
          {notice.text}
        </p>
      )}
    </div>
  )
}

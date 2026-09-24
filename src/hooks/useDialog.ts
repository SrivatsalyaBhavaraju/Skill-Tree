import { useEffect, useRef, type KeyboardEvent } from 'react'

export function useDialog<T extends HTMLElement>() {
  const dialog = useRef<T>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const scroll = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.focus()

    return () => {
      document.body.style.overflow = scroll
      opener?.focus()
    }
  }, [])

  function trapTab(event: KeyboardEvent) {
    if (event.key !== 'Tab') return false

    const focusable = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled)')
    if (!focusable || focusable.length === 0) return true

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
    return true
  }

  return { dialog, trapTab }
}

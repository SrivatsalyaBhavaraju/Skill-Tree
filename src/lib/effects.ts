const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'

const LOCK_SVG =
  '<svg viewBox="0 0 24 24" width="20" height="20"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2.5" fill="currentColor"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>'

export function prefersCalm(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function centerOf(element: Element) {
  const box = element.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

function floating(x: number, y: number, size: number): HTMLSpanElement {
  const element = document.createElement('span')
  Object.assign(element.style, {
    position: 'fixed',
    left: `${x - size / 2}px`,
    top: `${y - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    zIndex: '40',
    pointerEvents: 'none',
  })
  document.body.appendChild(element)
  return element
}

function sparks(origin: Element, color: string) {
  const { x, y } = centerOf(origin)
  const count = 14

  for (let i = 0; i < count; i++) {
    const spark = floating(x, y, 6)
    spark.style.borderRadius = '50%'
    spark.style.background = color
    const angle = (Math.PI * 2 * i) / count
    const distance = 34 + (i % 3) * 12

    spark
      .animate(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.2)`, opacity: 0 },
        ],
        { duration: 800, easing: EASE },
      )
      .finished.then(() => spark.remove())
  }
}

export function celebrate(tile: HTMLElement) {
  if (prefersCalm()) return
  const icon = tile.querySelector('.topic__icon') ?? tile

  icon.animate([{ transform: 'scale(0.6)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], {
    duration: 700,
    easing: EASE,
  })
  tile.animate(
    [
      { boxShadow: '0 0 0 0 color-mix(in srgb, var(--done) 55%, transparent)' },
      { boxShadow: '0 0 0 18px transparent' },
    ],
    { duration: 1200, easing: EASE },
  )
  sparks(icon, 'var(--done)')
}

export function unlock(tile: HTMLElement) {
  if (prefersCalm()) return
  const icon = tile.querySelector('.topic__icon') ?? tile
  const { x, y } = centerOf(icon)

  const lock = floating(x, y, 20)
  lock.style.color = 'var(--locked)'
  lock.innerHTML = LOCK_SVG
  lock
    .animate(
      [
        { transform: 'none', opacity: 1 },
        { transform: 'translate(3px, -10px) rotate(-15deg)', opacity: 1, offset: 0.25 },
        { transform: 'translate(18px, 70px) rotate(60deg)', opacity: 0 },
      ],
      { duration: 900, easing: 'cubic-bezier(0.5, 0, 0.9, 0.6)' },
    )
    .finished.then(() => lock.remove())

  tile.animate([{ transform: 'scale(0.96)', opacity: 0.6 }, { transform: 'scale(1.03)' }, { transform: 'none', opacity: 1 }], {
    duration: 1000,
    easing: EASE,
  })
  sparks(icon, 'var(--ready)')
}

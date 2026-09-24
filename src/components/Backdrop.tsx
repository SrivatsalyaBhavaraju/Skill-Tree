import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { BACKGROUNDS, type Background } from '../lib/background'
import { DOODLES } from './doodles'
import './Backdrop.css'

const COLUMNS = 5
const ROWS = 4

function noise(seed: number): number {
  const x = Math.sin(seed * 127.1) * 43758.5453
  return x - Math.floor(x)
}

type PlacedDoodle = {
  content: ReactNode
  style: CSSProperties
}

function layout(items: ReactNode[]): PlacedDoodle[] {
  return Array.from({ length: COLUMNS * ROWS }, (_, slot) => {
    const column = slot % COLUMNS
    const row = Math.floor(slot / COLUMNS)
    const random = (offset: number) => noise(slot * 10 + offset)

    return {
      content: items[slot % items.length],
      style: {
        left: `${((column + 0.1 + random(1) * 0.5) * 100) / COLUMNS}%`,
        top: `${((row + 0.1 + random(2) * 0.55) * 100) / ROWS}%`,
        fontSize: `${20 + random(3) * 12}px`,
        '--rot': `${(random(4) * 14 - 7).toFixed(1)}deg`,
        '--dx': `${Math.round(random(5) * 30 - 15)}px`,
        '--dy': `${Math.round(random(6) * 24 - 12)}px`,
        '--drift': `${14 + random(7) * 10}s`,
        '--write-delay': `${0.3 + slot * 0.12}s`,
      } as CSSProperties,
    }
  })
}

type Props = {
  kind: Background
}

export function Backdrop({ kind }: Props) {
  const parallax = useRef<HTMLDivElement>(null)
  const doodles = useMemo(() => layout(DOODLES[kind]), [kind])

  useEffect(() => {
    function follow(event: PointerEvent) {
      const x = (event.clientX / window.innerWidth - 0.5) * -18
      const y = (event.clientY / window.innerHeight - 0.5) * -14
      parallax.current?.style.setProperty('transform', `translate(${x}px, ${y}px)`)
    }

    window.addEventListener('pointermove', follow)
    return () => window.removeEventListener('pointermove', follow)
  }, [])

  return (
    <div className="backdrop" aria-hidden="true">
      {BACKGROUNDS.map((name) => (
        <div key={name} className={`backdrop__paper backdrop__paper--${name}`} data-active={name === kind} />
      ))}

      <div className="backdrop__parallax" ref={parallax}>
        <div key={kind} className="backdrop__doodles">
          {doodles.map((doodle, index) => (
            <div key={index} className="backdrop__doodle" style={doodle.style}>
              {doodle.content}
            </div>
          ))}
        </div>
      </div>

      <div className="backdrop__grain" />
    </div>
  )
}

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { prefersCalm } from '../lib/effects'

export type Edge = {
  from: string
  to: string
  lit: boolean
}

type Path = {
  key: string
  d: string
  lit: boolean
}

type Props = {
  edges: Edge[]
  board: RefObject<HTMLElement | null>
  tiles: RefObject<Map<string, HTMLElement>>
}

function position(element: HTMLElement, board: HTMLElement) {
  let x = 0
  let y = 0
  for (let node: HTMLElement | null = element; node && node !== board; node = node.offsetParent as HTMLElement | null) {
    x += node.offsetLeft
    y += node.offsetTop
  }
  return { x, y, width: element.offsetWidth, height: element.offsetHeight }
}

export function Connectors({ edges, board, tiles }: Props) {
  const [paths, setPaths] = useState<Path[]>([])
  const svg = useRef<SVGSVGElement>(null)
  const litBefore = useRef<Set<string> | null>(null)

  useEffect(() => {
    if (paths.length === 0) return
    const lit = new Set(paths.filter((path) => path.lit).map((path) => path.key))
    const before = litBefore.current
    litBefore.current = lit
    if (!before || prefersCalm()) return

    for (const key of lit) {
      if (before.has(key)) continue
      const element = svg.current?.querySelector<SVGPathElement>(`[data-key="${CSS.escape(key)}"]`)
      if (!element) continue
      const length = element.getTotalLength()
      element.animate(
        [
          { strokeDasharray: `${length}`, strokeDashoffset: `${length}` },
          { strokeDasharray: `${length}`, strokeDashoffset: '0' },
        ],
        { duration: 1000, delay: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' },
      )
    }
  }, [paths])

  useLayoutEffect(() => {
    const container = board.current
    if (!container) return

    function measure() {
      if (!container) return
      const next: Path[] = []

      for (const edge of edges) {
        const fromTile = tiles.current.get(edge.from)
        const toTile = tiles.current.get(edge.to)
        if (!fromTile || !toTile) continue

        const from = position(fromTile, container)
        const to = position(toTile, container)
        const x1 = from.x + from.width / 2
        const y1 = from.y + from.height + 4
        const x2 = to.x + to.width / 2
        const y2 = to.y - 4
        const bend = (y2 - y1) * 0.55

        next.push({
          key: `${edge.from}>${edge.to}`,
          d: `M${x1} ${y1} C${x1} ${y1 + bend} ${x2} ${y2 - bend} ${x2} ${y2}`,
          lit: edge.lit,
        })
      }
      setPaths(next)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    document.fonts?.ready.then(measure)
    return () => observer.disconnect()
  }, [edges, board, tiles])

  return (
    <svg ref={svg} className="connectors" aria-hidden="true">
      {paths.map((path, index) => (
        <g key={path.key}>
          <path data-key={path.key} className={path.lit ? 'connector connector--lit' : 'connector'} d={path.d} />
          {path.lit && (
            <circle className="connector__pulse" r="2.5">
              <animateMotion
                dur={`${2.6 + (index % 3) * 0.5}s`}
                begin={`${(index * 0.6) % 2}s`}
                repeatCount="indefinite"
                path={path.d}
                keyPoints="0;1"
                keyTimes="0;1"
                calcMode="spline"
                keySplines="0.45 0 0.55 1"
              />
            </circle>
          )}
        </g>
      ))}
    </svg>
  )
}

import type { ReactNode } from 'react'
import type { Background } from '../lib/background'

const triangle = (
  <svg width="120" height="90" viewBox="0 0 120 90">
    <path d="M10 80 L100 80 L100 15 Z" />
    <path d="M90 80 v-10 h10" />
    <text x="45" y="76">b</text>
    <text x="104" y="52">a</text>
    <text x="44" y="42">c</text>
  </svg>
)

const sineWave = (
  <svg width="150" height="80" viewBox="0 0 150 80">
    <path d="M8 40 H145 M12 8 V76" />
    <path d="M12 40 C 30 5, 48 5, 66 40 S 102 75, 120 40 S 138 18, 145 30" />
  </svg>
)

const parabola = (
  <svg width="110" height="100" viewBox="0 0 110 100">
    <path d="M55 8 V94 M8 80 H102" />
    <path d="M18 14 Q 55 140 92 14" />
  </svg>
)

const circle = (
  <svg width="100" height="100" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="38" />
    <path d="M50 50 L84 34" />
    <text x="62" y="36">r</text>
  </svg>
)

const benzene = (
  <svg width="90" height="90" viewBox="0 0 90 90">
    <path d="M45 8 L78 27 L78 63 L45 82 L12 63 L12 27 Z" />
    <path d="M45 18 L69 32 M69 58 L45 72 M21 58 L21 32" />
  </svg>
)

const cell = (
  <svg width="120" height="80" viewBox="0 0 120 80">
    <ellipse cx="60" cy="40" rx="52" ry="32" />
    <circle cx="68" cy="36" r="12" />
    <path d="M26 30 q 6 -6 12 0 M30 54 q 8 4 14 -2" />
  </svg>
)

const cube = (
  <svg width="80" height="80" viewBox="0 0 80 80">
    <path d="M20 30 L45 18 L68 30 L43 42 Z M20 30 V58 L43 70 V42 M68 30 V58 L43 70" />
  </svg>
)

const squiggle = (
  <svg width="100" height="60" viewBox="0 0 100 60">
    <path d="M8 40 C 25 10, 45 55, 62 25 S 82 20, 92 30" />
    <path d="M82 22 L92 30 L80 36" />
  </svg>
)

const circledNote = (
  <svg width="130" height="70" viewBox="0 0 130 70">
    <ellipse cx="65" cy="35" rx="56" ry="25" transform="rotate(-5 65 35)" />
    <text x="30" y="42">important!</text>
  </svg>
)

const star = (
  <svg width="60" height="60" viewBox="0 0 60 60">
    <path d="M30 6 L36 24 L54 24 L40 35 L45 53 L30 42 L15 53 L20 35 L6 24 L24 24 Z" />
  </svg>
)

const checklist = (
  <svg width="120" height="80" viewBox="0 0 120 80">
    <path d="M8 12 h12 v12 h-12 Z M11 18 l3 3 l6 -8 M8 36 h12 v12 h-12 Z M8 60 h12 v12 h-12 Z" />
    <path d="M30 18 H100 M30 42 H88 M30 66 H106" />
  </svg>
)

export const DOODLES: Record<Background, ReactNode[]> = {
  chalk: [
    '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂',
    'F = ma',
    'pH = −log[H⁺]',
    'ΔG < 0',
    'λ = c / f',
    'PV = nRT',
    '1789 → 1799',
    'cause → effect',
    'mitosis ≠ meiosis',
    'supply ↑  price ↓',
    benzene,
    cell,
    cube,
    squiggle,
  ],
  graph: [
    'a² + b² = c²',
    '∫₀^π sin x dx = 2',
    'dy/dx = 2x',
    'sin²θ + cos²θ = 1',
    'x = (−b ± √(b² − 4ac)) / 2a',
    'e^(iπ) + 1 = 0',
    'Σ 1/n² = π²/6',
    'lim x→0  sin x / x = 1',
    'A = πr²',
    'f(x) = 3x² − 2',
    triangle,
    sineWave,
    parabola,
    circle,
  ],
  notebook: [
    'revise ch. 4 !!',
    'ask about Q7',
    'key terms ↓',
    'test on Friday',
    'say it in my own words',
    '→ see p. 42',
    'draw the diagram',
    'why does this matter?',
    'compare with last week',
    circledNote,
    star,
    checklist,
    squiggle,
  ],
}

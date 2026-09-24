import { readFileSync } from 'node:fs'
import type { ChaosScenario } from '../src/lib/chaos'
import type { GeminiResult } from './gemini'

const SLOW_MS = 8000

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')
}

function wait(ms: number, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(true), ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve(false)
      },
      { once: true },
    )
  })
}

const REPLIES: Record<Exclude<ChaosScenario, 'normal' | 'server_error'>, string[]> = {
  partial: ['partially-broken.json'],
  repair: ['malformed-truncated.txt', 'valid-tree.json'],
  malformed: ['malformed-truncated.txt'],
  wrong_shape: ['wrong-shape.json'],
  empty: ['empty.txt'],
  slow: ['valid-tree.json'],
  busy: [],
}

export function chaosModel(scenario: Exclude<ChaosScenario, 'normal' | 'server_error'>, signal: AbortSignal) {
  let call = 0

  return async (): Promise<GeminiResult> => {
    if (scenario === 'busy') {
      return { ok: false, kind: 'busy', message: 'Chaos Mode: simulated Gemini 503, still busy after the retry.' }
    }
    if (scenario === 'slow' && !(await wait(SLOW_MS, signal))) {
      return { ok: false, kind: 'cancelled', message: 'The request was cancelled.' }
    }

    const files = REPLIES[scenario]
    const file = files[Math.min(call, files.length - 1)]
    call++
    return { ok: true, text: fixture(file) }
  }
}

import { requestTree, type GenerateResult } from './api.js'
import type { ChaosScenario } from './chaos.js'

type Request = (text: string, signal: AbortSignal, chaos?: ChaosScenario) => Promise<GenerateResult>

export type Outcome = { stale: true } | { stale: false; result: GenerateResult }

export const REQUEST_TIMEOUT_MS = 30_000

const TIMED_OUT: GenerateResult = {
  ok: false,
  kind: 'timeout',
  message: `No answer after ${REQUEST_TIMEOUT_MS / 1000} seconds.`,
}

export function createRequester(request: Request = requestTree, timeoutMs = REQUEST_TIMEOUT_MS) {
  let controller: AbortController | null = null
  let latest = 0

  return {
    async run(text: string, chaos?: ChaosScenario): Promise<Outcome> {
      controller?.abort()
      const own = new AbortController()
      controller = own
      const id = ++latest

      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        own.abort()
      }, timeoutMs)

      try {
        const result = await request(text, own.signal, chaos)
        if (id !== latest) return { stale: true }
        return { stale: false, result: timedOut ? TIMED_OUT : result }
      } finally {
        clearTimeout(timer)
      }
    },

    cancel() {
      controller?.abort()
      latest++
    },
  }
}

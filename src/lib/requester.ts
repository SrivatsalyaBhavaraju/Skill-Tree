import { requestTree, type GenerateResult } from './api'

type Request = (text: string, signal: AbortSignal) => Promise<GenerateResult>

export type Outcome = { stale: true } | { stale: false; result: GenerateResult }

export function createRequester(request: Request = requestTree) {
  let controller: AbortController | null = null
  let latest = 0

  return {
    async run(text: string): Promise<Outcome> {
      controller?.abort()
      const own = new AbortController()
      controller = own
      const id = ++latest

      const result = await request(text, own.signal)
      return id === latest ? { stale: false, result } : { stale: true }
    },

    cancel() {
      controller?.abort()
      latest++
    },
  }
}

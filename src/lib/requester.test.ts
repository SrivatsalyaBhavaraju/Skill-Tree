import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GenerateResult } from './api.js'
import { createRequester } from './requester.js'

const CANCELLED: GenerateResult = { ok: false, kind: 'cancelled', message: 'cancelled' }

function controllable() {
  const calls: { text: string; signal: AbortSignal; resolve: (result: GenerateResult) => void }[] = []
  const request = (text: string, signal: AbortSignal) =>
    new Promise<GenerateResult>((resolve) => {
      calls.push({ text, signal, resolve })
      signal.addEventListener('abort', () => resolve(CANCELLED))
    })
  return { calls, request }
}

function failure(message: string): GenerateResult {
  return { ok: false, kind: 'server', message }
}

describe('createRequester', () => {
  it('ignores an older response that arrives after a newer one', async () => {
    const { calls, request } = controllable()
    const requester = createRequester(request)

    const slow = requester.run('first')
    const fast = requester.run('second')
    calls[1].resolve(failure('second'))
    calls[0].resolve(failure('first'))

    expect(await fast).toEqual({ stale: false, result: failure('second') })
    expect(await slow).toEqual({ stale: true })
  })

  it('aborts the previous request when a new one starts', () => {
    const { calls, request } = controllable()
    const requester = createRequester(request)

    requester.run('first')
    requester.run('second')

    expect(calls[0].signal.aborted).toBe(true)
    expect(calls[1].signal.aborted).toBe(false)
  })

  it('marks the request in flight as stale when cancelled', async () => {
    const { calls, request } = controllable()
    const requester = createRequester(request)

    const pending = requester.run('first')
    requester.cancel()
    calls[0].resolve(failure('first'))

    expect(calls[0].signal.aborted).toBe(true)
    expect(await pending).toEqual({ stale: true })
  })

  describe('timeout', () => {
    afterEach(() => {
      vi.useRealTimers()
    })

    it('aborts and reports a timeout when there is no answer in time', async () => {
      vi.useFakeTimers()
      const { calls, request } = controllable()
      const requester = createRequester(request, 30_000)

      const pending = requester.run('first')
      await vi.advanceTimersByTimeAsync(30_000)
      const outcome = await pending

      expect(calls[0].signal.aborted).toBe(true)
      expect(outcome.stale === false && outcome.result).toMatchObject({ ok: false, kind: 'timeout' })
    })

    it('does not time out an answer that arrives in time', async () => {
      vi.useFakeTimers()
      const { calls, request } = controllable()
      const requester = createRequester(request, 30_000)

      const pending = requester.run('first')
      await vi.advanceTimersByTimeAsync(29_000)
      calls[0].resolve(failure('in time'))
      await vi.advanceTimersByTimeAsync(5_000)

      expect(await pending).toEqual({ stale: false, result: failure('in time') })
      expect(calls[0].signal.aborted).toBe(false)
    })
  })

  it('passes through the result of the only request', async () => {
    const { calls, request } = controllable()
    const requester = createRequester(request)

    const only = requester.run('first')
    calls[0].resolve(failure('first'))

    expect(await only).toEqual({ stale: false, result: failure('first') })
  })
})

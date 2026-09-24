import { describe, expect, it } from 'vitest'
import type { GenerateResult } from './api'
import { createRequester } from './requester'

function controllable() {
  const calls: { text: string; signal: AbortSignal; resolve: (result: GenerateResult) => void }[] = []
  const request = (text: string, signal: AbortSignal) =>
    new Promise<GenerateResult>((resolve) => calls.push({ text, signal, resolve }))
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

  it('passes through the result of the only request', async () => {
    const { calls, request } = controllable()
    const requester = createRequester(request)

    const only = requester.run('first')
    calls[0].resolve(failure('first'))

    expect(await only).toEqual({ stale: false, result: failure('first') })
  })
})

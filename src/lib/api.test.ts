import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { requestCardFix, requestTree } from './api.js'
import { readModelOutput } from './validate.js'

function validServerTree() {
  const result = readModelOutput(readFileSync(new URL('../../fixtures/valid-tree.json', import.meta.url), 'utf8'))
  if (!result.ok) throw new Error('fixture should be valid')
  return result.tree
}

describe('requestTree', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts the text as JSON', async () => {
    fetchMock.mockResolvedValue(Response.json({ tree: validServerTree(), report: { fixed: [], dropped: [] } }))

    await requestTree('Photosynthesis')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/generate')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'Photosynthesis' })
  })

  it('sends a chaos scenario only when one is picked', async () => {
    fetchMock.mockImplementation(async () => Response.json({ tree: validServerTree(), report: {} }))

    await requestTree('Photosynthesis', undefined, 'partial')
    await requestTree('Photosynthesis', undefined, 'normal')

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({ text: 'Photosynthesis', chaos: 'partial' })
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ text: 'Photosynthesis' })
  })

  it('returns the re-validated tree with the server report', async () => {
    const report = { fixed: ['"A": removed a link to itself'], dropped: [] }
    fetchMock.mockResolvedValue(Response.json({ tree: validServerTree(), report }))

    const result = await requestTree('Photosynthesis')

    expect(result.ok && result.tree.nodes).toHaveLength(4)
    expect(result.ok && result.report).toEqual(report)
  })

  it('passes on whether the server needed a repair retry', async () => {
    fetchMock.mockResolvedValue(Response.json({ tree: validServerTree(), report: {}, repaired: true }))

    const result = await requestTree('Photosynthesis')

    expect(result.ok && result.repaired).toBe(true)
  })

  it('does not trust a tree from the server that fails validation', async () => {
    fetchMock.mockResolvedValue(Response.json({ tree: { title: 'X', nodes: [] }, report: {} }))

    const result = await requestTree('Photosynthesis')

    expect(result).toEqual({ ok: false, kind: 'empty', message: 'The response contained no topics.' })
  })

  it('passes on the kind and message of a server error', async () => {
    fetchMock.mockResolvedValue(
      Response.json({ error: { kind: 'rate_limit', message: 'Too many requests.' } }, { status: 429 }),
    )

    expect(await requestTree('Photosynthesis')).toEqual({
      ok: false,
      kind: 'rate_limit',
      message: 'Too many requests.',
    })
  })

  it('handles an error body it does not recognise', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: { kind: 'teapot' } }, { status: 418 }))

    const result = await requestTree('Photosynthesis')

    expect(!result.ok && result.kind).toBe('server')
  })

  it('handles a response that is not JSON, like a gateway timeout page', async () => {
    fetchMock.mockResolvedValue(new Response('<html>504 Gateway Timeout</html>', { status: 504 }))

    const result = await requestTree('Photosynthesis')

    expect(!result.ok && result.kind).toBe('server')
    expect(!result.ok && result.message).toContain('504')
  })

  it('reports a cancelled request as cancelled, not as a network error', async () => {
    const controller = new AbortController()
    controller.abort()
    fetchMock.mockRejectedValue(new DOMException('The operation was aborted.', 'AbortError'))

    const result = await requestTree('Photosynthesis', controller.signal)

    expect(!result.ok && result.kind).toBe('cancelled')
  })

  it('passes the abort signal to fetch', async () => {
    const controller = new AbortController()
    fetchMock.mockResolvedValue(Response.json({ tree: validServerTree(), report: {} }))

    await requestTree('Photosynthesis', controller.signal)

    expect(fetchMock.mock.calls[0][1]?.signal).toBe(controller.signal)
  })

  it('reports a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

    const result = await requestTree('Photosynthesis')

    expect(!result.ok && result.kind).toBe('network')
  })

  describe('requestCardFix', () => {
    const card = { id: 'a#1', type: 'flashcard' as const, front: 'Q', back: 'Old answer' }

    it('returns the re-validated replacement card', async () => {
      fetchMock.mockResolvedValue(Response.json({ card: { type: 'flashcard', front: 'Q', back: 'New answer' } }))

      const result = await requestCardFix({ label: 'A', summary: '' }, card, 'some notes')

      expect(result).toEqual({ ok: true, card: { type: 'flashcard', front: 'Q', back: 'New answer' } })
      expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ topic: 'A', notes: 'some notes' })
    })

    it('does not trust a broken card from the server', async () => {
      fetchMock.mockResolvedValue(Response.json({ card: { type: 'flashcard', front: '' } }))

      const result = await requestCardFix({ label: 'A', summary: '' }, card, null)

      expect(!result.ok && result.kind).toBe('wrong_shape')
    })
  })
})


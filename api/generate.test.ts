import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './generate'

function fixture(name: string): string {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8')
}

function post(body: string): Request {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
}

function geminiReply(text: string, status = 200): Response {
  return Response.json({ candidates: [{ content: { parts: [{ text }] } }] }, { status })
}

describe('POST /api/generate', () => {
  const originalKey = process.env.GEMINI_API_KEY
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY
    } else {
      process.env.GEMINI_API_KEY = originalKey
    }
  })

  async function send(body: string) {
    const response = await POST(post(body))
    return { status: response.status, body: await response.json() }
  }

  describe('input', () => {
    it.each([
      ['a body that is not JSON', '{not json'],
      ['a body without text', '{"notes":"hi"}'],
      ['empty text', '{"text":"   "}'],
      ['text that is too long', JSON.stringify({ text: 'a'.repeat(20001) })],
    ])('rejects %s without calling the model', async (_, body) => {
      const { status, body: json } = await send(body)

      expect(status).toBe(400)
      expect(json.error.kind).toBe('bad_input')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('fails clearly when the API key is missing', async () => {
      delete process.env.GEMINI_API_KEY

      const { status, body } = await send('{"text":"Photosynthesis"}')

      expect(status).toBe(500)
      expect(body.error).toEqual({ kind: 'config', message: 'The server is missing its API key.' })
    })
  })

  describe('model call', () => {
    it('returns the validated tree and repair report', async () => {
      fetchMock.mockResolvedValue(geminiReply(fixture('partially-broken.json')))

      const { status, body } = await send('{"text":"Photosynthesis"}')

      expect(status).toBe(200)
      expect(body.tree.nodes).toHaveLength(4)
      expect(body.report.dropped).toHaveLength(2)
    })

    it('sends the key in a header and asks for JSON', async () => {
      fetchMock.mockResolvedValue(geminiReply(fixture('valid-tree.json')))

      await send('{"text":"Photosynthesis"}')

      const [url, init] = fetchMock.mock.calls[0]
      const headers = init?.headers as Record<string, string>
      expect(String(url)).not.toContain('test-key')
      expect(headers['x-goog-api-key']).toBe('test-key')
      expect(JSON.parse(String(init?.body)).generationConfig.responseMimeType).toBe('application/json')
    })

    it.each([
      [429, 'rate_limit', 429, 2],
      [503, 'busy', 503, 2],
      [500, 'upstream', 502, 1],
    ])('maps a %i from the model to %s', async (modelStatus, kind, status, calls) => {
      vi.useFakeTimers()
      fetchMock.mockImplementation(async () => new Response('{}', { status: modelStatus }))

      const pending = send('{"text":"Photosynthesis"}')
      await vi.advanceTimersByTimeAsync(2000)
      const response = await pending

      expect(response.status).toBe(status)
      expect(response.body.error.kind).toBe(kind)
      expect(fetchMock).toHaveBeenCalledTimes(calls)
    })

    it('retries once when the model is busy, and succeeds', async () => {
      vi.useFakeTimers()
      fetchMock
        .mockResolvedValueOnce(new Response('{}', { status: 503 }))
        .mockResolvedValueOnce(geminiReply(fixture('valid-tree.json')))

      const pending = send('{"text":"Photosynthesis"}')
      await vi.advanceTimersByTimeAsync(2000)
      const { status, body } = await pending

      expect(status).toBe(200)
      expect(body.tree.nodes).toHaveLength(4)
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('reports a model call that ran out of time as a timeout', async () => {
      const request = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"text":"Photosynthesis"}',
        signal: AbortSignal.abort(new DOMException('Timed out', 'TimeoutError')),
      })
      fetchMock.mockRejectedValue(new DOMException('Timed out', 'TimeoutError'))

      const response = await POST(request)

      expect(response.status).toBe(504)
      expect((await response.json()).error.kind).toBe('timeout')
    })

    it('reports a network failure', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))

      const { status, body } = await send('{"text":"Photosynthesis"}')

      expect(status).toBe(502)
      expect(body.error.kind).toBe('network')
    })

    it.each([
      ['malformed-truncated.txt', 'malformed'],
      ['empty.txt', 'empty'],
      ['wrong-shape.json', 'wrong_shape'],
    ])('reports unusable model output (%s) as %s', async (name, kind) => {
      fetchMock.mockImplementation(async () => geminiReply(fixture(name)))

      const { status, body } = await send('{"text":"Photosynthesis"}')

      expect(status).toBe(502)
      expect(body.error.kind).toBe(kind)
    })

    it('repairs unusable output once by sending the problems back', async () => {
      fetchMock
        .mockResolvedValueOnce(geminiReply(fixture('malformed-truncated.txt')))
        .mockResolvedValueOnce(geminiReply(fixture('valid-tree.json')))

      const { status, body } = await send('{"text":"Photosynthesis"}')

      expect(status).toBe(200)
      expect(body.repaired).toBe(true)
      expect(body.tree.nodes).toHaveLength(4)
      expect(fetchMock).toHaveBeenCalledTimes(2)
      const repairRequest = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
      expect(repairRequest.contents[0].parts[0].text).toContain('could not be used')
    })

    it('gives up after one repair attempt', async () => {
      fetchMock.mockImplementation(async () => geminiReply(fixture('wrong-shape.json')))

      const { status, body } = await send('{"text":"Photosynthesis"}')

      expect(status).toBe(502)
      expect(body.error.kind).toBe('wrong_shape')
      expect(body.error.message).toContain('A repair attempt did not fix it.')
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('does not repair output that was usable the first time', async () => {
      fetchMock.mockResolvedValue(geminiReply(fixture('partially-broken.json')))

      const { body } = await send('{"text":"Photosynthesis"}')

      expect(body.repaired).toBe(false)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('treats a reply with no candidates as empty', async () => {
      fetchMock.mockImplementation(async () => Response.json({ promptFeedback: { blockReason: 'SAFETY' } }))

      const { body } = await send('{"text":"Photosynthesis"}')

      expect(body.error.kind).toBe('empty')
    })
  })
})

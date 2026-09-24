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
      [429, 'rate_limit', 429],
      [500, 'upstream', 502],
      [503, 'upstream', 502],
    ])('maps a %i from the model to %s', async (modelStatus, kind, status) => {
      fetchMock.mockResolvedValue(new Response('{}', { status: modelStatus }))

      const response = await send('{"text":"Photosynthesis"}')

      expect(response.status).toBe(status)
      expect(response.body.error.kind).toBe(kind)
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
      fetchMock.mockResolvedValue(geminiReply(fixture(name)))

      const { status, body } = await send('{"text":"Photosynthesis"}')

      expect(status).toBe(502)
      expect(body.error.kind).toBe(kind)
    })

    it('treats a reply with no candidates as empty', async () => {
      fetchMock.mockResolvedValue(Response.json({ promptFeedback: { blockReason: 'SAFETY' } }))

      const { body } = await send('{"text":"Photosynthesis"}')

      expect(body.error.kind).toBe('empty')
    })
  })
})

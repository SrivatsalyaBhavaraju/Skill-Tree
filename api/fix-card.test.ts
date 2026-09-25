import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from './fix-card.js'

const CARD = { type: 'truefalse', statement: 'The Calvin cycle needs light directly.', answer: true, explanation: 'Wrong on purpose.' }

function post(body: unknown): Request {
  return new Request('http://localhost/api/fix-card', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function geminiReply(value: unknown): Response {
  const text = typeof value === 'string' ? value : JSON.stringify(value)
  return Response.json({ candidates: [{ content: { parts: [{ text }] } }] })
}

describe('POST /api/fix-card', () => {
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

  async function send(body: unknown) {
    const response = await POST(post(body))
    return { status: response.status, body: await response.json() }
  }

  it('returns a validated replacement card', async () => {
    const fixed = { ...CARD, answer: false, explanation: 'It uses ATP and NADPH made by the light reactions.' }
    fetchMock.mockResolvedValue(geminiReply(fixed))

    const { status, body } = await send({ topic: 'Calvin Cycle', card: CARD })

    expect(status).toBe(200)
    expect(body.card).toEqual(fixed)
  })

  it('sends the card and the notes to the model', async () => {
    fetchMock.mockResolvedValue(geminiReply(CARD))

    await send({ topic: 'Calvin Cycle', card: CARD, notes: 'The Calvin cycle takes place in the stroma.' })

    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    const prompt = request.contents[0].parts[0].text
    expect(prompt).toContain('The Calvin cycle needs light directly.')
    expect(prompt).toContain('takes place in the stroma')
    expect(request.systemInstruction.parts[0].text).toContain('exact quote')
  })

  it('rejects a replacement card that breaks the rules', async () => {
    fetchMock.mockResolvedValue(geminiReply({ type: 'mcq', question: 'Q', options: ['a', 'b'], answerIndex: 5 }))

    const { status, body } = await send({ topic: 'Calvin Cycle', card: CARD })

    expect(status).toBe(502)
    expect(body.error.kind).toBe('wrong_shape')
  })

  it('reports a garbled replacement as malformed', async () => {
    fetchMock.mockResolvedValue(geminiReply('{"type": "flashcard", "front": "Q'))

    const { body } = await send({ topic: 'Calvin Cycle', card: CARD })

    expect(body.error.kind).toBe('malformed')
  })

  it.each([
    ['no topic', { card: CARD }],
    ['a broken card', { topic: 'Calvin Cycle', card: { type: 'essay' } }],
    ['notes that are too long', { topic: 'Calvin Cycle', card: CARD, notes: 'a'.repeat(20001) }],
  ])('rejects a request with %s without calling the model', async (_, body) => {
    const { status } = await send(body)

    expect(status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

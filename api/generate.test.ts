import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { POST } from './generate'

function post(body: string): Request {
  return new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  })
}

describe('POST /api/generate', () => {
  const originalKey = process.env.GEMINI_API_KEY

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key'
  })

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.GEMINI_API_KEY
    } else {
      process.env.GEMINI_API_KEY = originalKey
    }
  })

  it('rejects a body that is not JSON', async () => {
    const response = await POST(post('{not json'))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Request body must be JSON.' })
  })

  it('fails clearly when the API key is missing', async () => {
    delete process.env.GEMINI_API_KEY

    const response = await POST(post('{"text":"hi"}'))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'The server is missing its API key.' })
  })
})

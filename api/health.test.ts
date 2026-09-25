import { afterEach, describe, expect, it } from 'vitest'
import { GET } from './health.js'

describe('GET /api/health', () => {
  const saved = { ...process.env }

  afterEach(() => {
    process.env = { ...saved }
  })

  it('says the key is set without revealing it', async () => {
    process.env.GEMINI_API_KEY = 'secret-value'

    const text = await GET().text()

    expect(JSON.parse(text)).toMatchObject({ ok: true, key: 'set' })
    expect(text).not.toContain('secret-value')
  })

  it('tells a missing key from an empty one', async () => {
    delete process.env.GEMINI_API_KEY
    expect(await GET().json()).toMatchObject({ ok: false, key: 'missing' })

    process.env.GEMINI_API_KEY = '   '
    expect(await GET().json()).toMatchObject({ ok: false, key: 'empty' })
  })

  it('lists similarly named variables, quoted so stray spaces show up', async () => {
    delete process.env.GEMINI_API_KEY
    process.env['GEMINI_API_KEY '] = 'oops'

    expect((await GET().json()).similarNames).toContain('"GEMINI_API_KEY "')
  })
})

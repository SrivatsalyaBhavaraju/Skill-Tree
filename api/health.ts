const KEY_NAME = 'GEMINI_API_KEY'
const RELATED = /gemini|google|api_?key/i

export function GET(): Response {
  const value = process.env[KEY_NAME]
  const key = value === undefined ? 'missing' : value.trim() === '' ? 'empty' : 'set'
  const similar = Object.keys(process.env).filter((name) => name !== KEY_NAME && RELATED.test(name))

  return Response.json({
    ok: key === 'set',
    key,
    model: process.env.GEMINI_MODEL || 'default',
    environment: process.env.VERCEL_ENV ?? 'local',
    similarNames: similar.map((name) => JSON.stringify(name)),
  })
}

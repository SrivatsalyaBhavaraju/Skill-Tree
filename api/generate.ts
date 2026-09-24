import type { ErrorKind } from '../src/lib/errors'
import { checkInput } from '../src/lib/input'
import { readModelOutput } from '../src/lib/validate'
import { callGemini } from './gemini'
import { buildPrompt } from './prompt'

const STATUS: Record<ErrorKind, number> = {
  bad_input: 400,
  config: 500,
  network: 502,
  rate_limit: 429,
  upstream: 502,
  empty: 502,
  malformed: 502,
  wrong_shape: 502,
  server: 500,
  cancelled: 499,
}

function errorResponse(kind: ErrorKind, message: string): Response {
  return Response.json({ error: { kind, message } }, { status: STATUS[kind] })
}

async function readText(request: Request): Promise<string | null> {
  try {
    const body: unknown = await request.json()
    if (typeof body === 'object' && body !== null && 'text' in body && typeof body.text === 'string') {
      return body.text
    }
    return null
  } catch {
    return null
  }
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return errorResponse('config', 'The server is missing its API key.')
  }

  const text = await readText(request)
  if (text === null) {
    return errorResponse('bad_input', 'Send JSON like {"text": "..."}.')
  }

  const inputProblem = checkInput(text)
  if (inputProblem) {
    return errorResponse('bad_input', inputProblem)
  }

  const reply = await callGemini(buildPrompt(text), apiKey, request.signal)
  if (!reply.ok) {
    return errorResponse(reply.kind, reply.message)
  }

  const result = readModelOutput(reply.text)
  if (!result.ok) {
    return errorResponse(result.kind, result.message)
  }

  return Response.json({ tree: result.tree, report: result.report })
}

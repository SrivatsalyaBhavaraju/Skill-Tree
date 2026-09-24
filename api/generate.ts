import { isChaosScenario, type ChaosScenario } from '../src/lib/chaos'
import type { ErrorKind } from '../src/lib/errors'
import { checkInput } from '../src/lib/input'
import { readModelOutput } from '../src/lib/validate'
import { chaosModel } from './chaos'
import { callGemini } from './gemini'
import { buildPrompt, buildRepairPrompt, type Prompt } from './prompt'

const STATUS: Record<ErrorKind, number> = {
  bad_input: 400,
  config: 500,
  network: 502,
  rate_limit: 429,
  busy: 503,
  upstream: 502,
  empty: 502,
  malformed: 502,
  wrong_shape: 502,
  server: 500,
  cancelled: 499,
  timeout: 504,
}

const MODEL_TIMEOUT_MS = 25_000

function errorResponse(kind: ErrorKind, message: string): Response {
  return Response.json({ error: { kind, message } }, { status: STATUS[kind] })
}

async function readBody(request: Request): Promise<{ text: string; chaos: ChaosScenario } | null> {
  try {
    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('text' in body) || typeof body.text !== 'string') {
      return null
    }
    const chaos = 'chaos' in body && isChaosScenario(body.chaos) ? body.chaos : 'normal'
    return { text: body.text, chaos }
  } catch {
    return null
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await readBody(request)
  if (body === null) {
    return errorResponse('bad_input', 'Send JSON like {"text": "..."}.')
  }

  const inputProblem = checkInput(body.text)
  if (inputProblem) {
    return errorResponse('bad_input', inputProblem)
  }

  if (body.chaos === 'server_error') {
    return errorResponse('server', 'Chaos Mode: simulated server crash.')
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey && body.chaos === 'normal') {
    return errorResponse('config', 'The server is missing its API key.')
  }

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(MODEL_TIMEOUT_MS)])
  const ask =
    body.chaos === 'normal'
      ? (prompt: Prompt) => callGemini(prompt, apiKey ?? '', signal)
      : chaosModel(body.chaos, signal)

  const prompt = buildPrompt(body.text)

  const reply = await ask(prompt)
  if (!reply.ok) {
    return errorResponse(reply.kind, reply.message)
  }

  let result = readModelOutput(reply.text)
  let repaired = false

  if (!result.ok) {
    const problems = [result.message, ...result.details]
    const retry = await ask(buildRepairPrompt(prompt, reply.text, problems))
    if (!retry.ok) {
      return errorResponse(retry.kind, retry.message)
    }
    result = readModelOutput(retry.text)
    repaired = true
  }

  if (!result.ok) {
    return errorResponse(result.kind, `${result.message} A repair attempt did not fix it.`)
  }

  return Response.json({ tree: result.tree, report: result.report, repaired })
}

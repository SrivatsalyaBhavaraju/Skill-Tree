import { checkInput } from '../src/lib/input'
import { isRecord, parseModelText, validateCard } from '../src/lib/validate'
import { callGemini } from './gemini'
import { buildFixPrompt } from './prompt'
import { errorResponse, MODEL_TIMEOUT_MS } from './respond'

type FixRequest = {
  topic: string
  summary: string
  card: unknown
  notes: string | null
}

async function readBody(request: Request): Promise<FixRequest | string> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return 'Request body must be JSON.'
  }

  if (!isRecord(body) || typeof body.topic !== 'string' || body.topic.trim() === '' || body.topic.length > 200) {
    return 'Send the topic name as "topic".'
  }
  if (!validateCard(body.card).ok) {
    return 'Send the card to fix as "card".'
  }
  if (body.notes !== undefined && (typeof body.notes !== 'string' || checkInput(body.notes) !== null)) {
    return 'Notes must be text of up to 20,000 characters.'
  }

  return {
    topic: body.topic.trim(),
    summary: typeof body.summary === 'string' ? body.summary.slice(0, 500) : '',
    card: body.card,
    notes: typeof body.notes === 'string' ? body.notes : null,
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await readBody(request)
  if (typeof body === 'string') {
    return errorResponse('bad_input', body)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return errorResponse('config', 'The server is missing its API key.')
  }

  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(MODEL_TIMEOUT_MS)])
  const reply = await callGemini(buildFixPrompt(body.topic, body.summary, body.card, body.notes), apiKey, signal)
  if (!reply.ok) {
    return errorResponse(reply.kind, reply.message)
  }

  const parsed = parseModelText(reply.text)
  if (!parsed.ok) {
    return errorResponse(parsed.kind, parsed.message)
  }

  const checked = validateCard(parsed.data)
  if (!checked.ok) {
    return errorResponse('wrong_shape', `The fixed card was not usable. ${checked.reason}`)
  }

  return Response.json({ card: checked.card })
}

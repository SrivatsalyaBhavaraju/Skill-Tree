import type { Prompt } from './prompt.js'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'
const RETRY_DELAY_MS = 1500
const RETRYABLE: GeminiFailureKind[] = ['busy', 'rate_limit']

export type GeminiFailureKind = 'network' | 'rate_limit' | 'busy' | 'upstream' | 'timeout' | 'cancelled'

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; kind: GeminiFailureKind; message: string }

type GeminiBody = {
  candidates?: { content?: { parts?: { text?: unknown }[] } }[]
}

function extractText(body: unknown): string {
  const parts = (body as GeminiBody | null)?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return ''

  return parts.map((part) => (typeof part?.text === 'string' ? part.text : '')).join('')
}

function abortedResult(signal: AbortSignal): GeminiResult {
  return signal.reason instanceof DOMException && signal.reason.name === 'TimeoutError'
    ? { ok: false, kind: 'timeout', message: 'The AI service took too long to answer.' }
    : { ok: false, kind: 'cancelled', message: 'The request was cancelled.' }
}

function pause(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

async function attempt(prompt: Prompt, apiKey: string, signal?: AbortSignal): Promise<GeminiResult> {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL

  let response: Response
  try {
    response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
      }),
      signal,
    })
  } catch {
    if (signal?.aborted) return abortedResult(signal)
    return { ok: false, kind: 'network', message: 'Could not reach the AI service.' }
  }

  if (response.status === 429) {
    return { ok: false, kind: 'rate_limit', message: 'The AI service is getting too many requests right now.' }
  }
  if (response.status === 503) {
    return { ok: false, kind: 'busy', message: 'The AI model is overloaded right now (503).' }
  }
  if (!response.ok) {
    return { ok: false, kind: 'upstream', message: `The AI service returned an error (${response.status}).` }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    if (signal?.aborted) return abortedResult(signal)
    return { ok: false, kind: 'upstream', message: 'The AI service sent a response we could not read.' }
  }

  return { ok: true, text: extractText(body) }
}

export async function callGemini(prompt: Prompt, apiKey: string, signal?: AbortSignal): Promise<GeminiResult> {
  const first = await attempt(prompt, apiKey, signal)
  if (first.ok || !RETRYABLE.includes(first.kind)) return first

  await pause(RETRY_DELAY_MS, signal)
  if (signal?.aborted) return abortedResult(signal)

  return attempt(prompt, apiKey, signal)
}

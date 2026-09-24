import type { Prompt } from './prompt'

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODEL = 'gemini-3.5-flash-lite'

export type GeminiFailureKind = 'network' | 'rate_limit' | 'upstream'

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

export async function callGemini(prompt: Prompt, apiKey: string, signal?: AbortSignal): Promise<GeminiResult> {
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
    return { ok: false, kind: 'network', message: 'Could not reach the AI service.' }
  }

  if (response.status === 429) {
    return { ok: false, kind: 'rate_limit', message: 'The AI service is getting too many requests right now.' }
  }
  if (!response.ok) {
    return { ok: false, kind: 'upstream', message: `The AI service returned an error (${response.status}).` }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { ok: false, kind: 'upstream', message: 'The AI service sent a response we could not read.' }
  }

  return { ok: true, text: extractText(body) }
}

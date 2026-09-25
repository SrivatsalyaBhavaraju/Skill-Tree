import type { ChaosScenario } from './chaos.js'
import { isErrorKind, type ErrorKind } from './errors.js'
import type { Card, SkillTree } from './schema.js'
import { isRecord, validateCard, validateTree, type CardDraft, type RepairReport } from './validate.js'

type Failure = { ok: false; kind: ErrorKind; message: string }

export type GenerateResult = { ok: true; tree: SkillTree; report: RepairReport; repaired: boolean } | Failure

export type FixResult = { ok: true; card: CardDraft } | Failure

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function readReport(value: unknown): RepairReport {
  return isRecord(value) ? { fixed: strings(value.fixed), dropped: strings(value.dropped) } : { fixed: [], dropped: [] }
}

function readError(body: unknown, status: number): Failure {
  const error = isRecord(body) ? body.error : undefined

  if (isRecord(error) && isErrorKind(error.kind) && typeof error.message === 'string') {
    return { ok: false, kind: error.kind, message: error.message }
  }
  return { ok: false, kind: 'server', message: `The server returned an error (${status}).` }
}

const CANCELLED: Failure = { ok: false, kind: 'cancelled', message: 'The request was cancelled.' }

async function postJson(url: string, payload: unknown, signal?: AbortSignal): Promise<{ ok: true; body: unknown } | Failure> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    })
  } catch {
    if (signal?.aborted) return CANCELLED
    return { ok: false, kind: 'network', message: 'Could not reach the server. Check your connection.' }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    if (signal?.aborted) return CANCELLED
    return { ok: false, kind: 'server', message: `The server sent a response we could not read (${response.status}).` }
  }

  return response.ok ? { ok: true, body } : readError(body, response.status)
}

export async function requestTree(text: string, signal?: AbortSignal, chaos?: ChaosScenario): Promise<GenerateResult> {
  const posted = await postJson('/api/generate', chaos && chaos !== 'normal' ? { text, chaos } : { text }, signal)
  if (!posted.ok) return posted
  const { body } = posted

  const result = validateTree(isRecord(body) ? body.tree : undefined)
  if (!result.ok) {
    return { ok: false, kind: result.kind, message: result.message }
  }

  const serverReport = readReport(isRecord(body) ? body.report : undefined)
  return {
    ok: true,
    tree: result.tree,
    repaired: isRecord(body) && body.repaired === true,
    report: {
      fixed: [...serverReport.fixed, ...result.report.fixed],
      dropped: [...serverReport.dropped, ...result.report.dropped],
    },
  }
}

export async function requestCardFix(
  topic: { label: string; summary: string },
  card: Card,
  notes: string | null,
  signal?: AbortSignal,
): Promise<FixResult> {
  const payload = { topic: topic.label, summary: topic.summary, card, ...(notes ? { notes } : {}) }

  const posted = await postJson('/api/fix-card', payload, signal)
  if (!posted.ok) return posted

  const checked = validateCard(isRecord(posted.body) ? posted.body.card : undefined)
  return checked.ok ? { ok: true, card: checked.card } : { ok: false, kind: 'wrong_shape', message: checked.reason }
}

import { isErrorKind, type ErrorKind } from './errors'
import type { SkillTree } from './schema'
import { isRecord, validateTree, type RepairReport } from './validate'

export type GenerateResult =
  | { ok: true; tree: SkillTree; report: RepairReport; repaired: boolean }
  | { ok: false; kind: ErrorKind; message: string }

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function readReport(value: unknown): RepairReport {
  return isRecord(value) ? { fixed: strings(value.fixed), dropped: strings(value.dropped) } : { fixed: [], dropped: [] }
}

function readError(body: unknown, status: number): GenerateResult {
  const error = isRecord(body) ? body.error : undefined

  if (isRecord(error) && isErrorKind(error.kind) && typeof error.message === 'string') {
    return { ok: false, kind: error.kind, message: error.message }
  }
  return { ok: false, kind: 'server', message: `The server returned an error (${status}).` }
}

const CANCELLED: GenerateResult = { ok: false, kind: 'cancelled', message: 'The request was cancelled.' }

export async function requestTree(text: string, signal?: AbortSignal): Promise<GenerateResult> {
  let response: Response
  try {
    response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
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

  if (!response.ok) {
    return readError(body, response.status)
  }

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

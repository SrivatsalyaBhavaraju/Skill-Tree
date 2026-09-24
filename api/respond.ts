import type { ErrorKind } from '../src/lib/errors'

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

export const MODEL_TIMEOUT_MS = 25_000

export function errorResponse(kind: ErrorKind, message: string): Response {
  return Response.json({ error: { kind, message } }, { status: STATUS[kind] })
}

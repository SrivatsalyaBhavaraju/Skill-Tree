export const ERROR_KINDS = [
  'bad_input',
  'config',
  'network',
  'rate_limit',
  'upstream',
  'empty',
  'malformed',
  'wrong_shape',
  'server',
  'cancelled',
  'timeout',
] as const

export type ErrorKind = (typeof ERROR_KINDS)[number]

export function isErrorKind(value: unknown): value is ErrorKind {
  return ERROR_KINDS.includes(value as ErrorKind)
}

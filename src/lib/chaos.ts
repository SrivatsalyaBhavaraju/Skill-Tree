export const CHAOS_SCENARIOS = {
  normal: { label: 'Normal', detail: 'Real Gemini call' },
  partial: { label: 'Partially broken', detail: 'Bad index, duplicate option, loop, broken topic: salvaged' },
  repair: { label: 'Broken, then fixed', detail: 'Unusable first answer, fixed by the repair retry' },
  invented: { label: 'Invented quotes', detail: 'Cards quoting things not in your notes (use the sample notes)' },
  malformed: { label: 'Malformed JSON', detail: 'Answer cut off mid-string, twice' },
  wrong_shape: { label: 'Wrong shape', detail: 'Valid JSON with the wrong keys, twice' },
  empty: { label: 'Empty', detail: 'The model returns nothing, twice' },
  slow: { label: 'Slow (8 s)', detail: 'Valid answer after 8 seconds' },
  busy: { label: 'AI overloaded', detail: 'Gemini 503, even after the automatic retry' },
  server_error: { label: 'Server error', detail: 'Our server fails with a 500' },
} as const

export type ChaosScenario = keyof typeof CHAOS_SCENARIOS

export function isChaosScenario(value: unknown): value is ChaosScenario {
  return typeof value === 'string' && Object.hasOwn(CHAOS_SCENARIOS, value)
}

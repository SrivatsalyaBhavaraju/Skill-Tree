import { isNotes } from './input.js'
import type { Subject } from './schema.js'

export const BACKGROUNDS = ['chalk', 'graph', 'notebook'] as const

export type Background = (typeof BACKGROUNDS)[number]

export function pickBackground(text: string, subject?: Subject): Background {
  if (isNotes(text)) return 'notebook'
  return subject === 'math' ? 'graph' : 'chalk'
}

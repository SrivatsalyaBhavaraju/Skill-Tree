import { isNotes } from './input'

export const BACKGROUNDS = ['chalk', 'graph', 'notebook'] as const

export type Background = (typeof BACKGROUNDS)[number]

export function pickBackground(text: string): Background {
  return isNotes(text) ? 'notebook' : 'chalk'
}

import { LIMITS } from './schema.js'

export const MAX_INPUT_CHARS = 20000

export function checkInput(text: string): string | null {
  const trimmed = text.trim()

  if (trimmed === '') {
    return 'Paste some notes or type a topic first.'
  }
  if (trimmed.length > MAX_INPUT_CHARS) {
    return `That is too long. Keep it under ${MAX_INPUT_CHARS.toLocaleString('en-US')} characters.`
  }
  return null
}

export function isNotes(text: string): boolean {
  return text.trim().length >= LIMITS.notesMinChars
}

import type { SkillTree } from './schema.js'

export type Grounding = 'found' | 'not_found' | 'no_quote'

const MIN_FUZZY_WORDS = 4
const MATCH_RATIO = 0.85

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function inOrderMatches(quote: string[], window: string[]): number {
  const previous = new Array<number>(window.length + 1).fill(0)

  for (const word of quote) {
    let diagonal = 0
    for (let j = 1; j <= window.length; j++) {
      const above = previous[j]
      previous[j] = word === window[j - 1] ? diagonal + 1 : Math.max(previous[j], previous[j - 1])
      diagonal = above
    }
  }
  return previous[window.length]
}

export function isGrounded(quote: string, notes: string): boolean {
  const quoteWords = words(quote)
  const noteWords = words(notes)
  if (quoteWords.length === 0) return false

  if (` ${noteWords.join(' ')} `.includes(` ${quoteWords.join(' ')} `)) return true
  if (quoteWords.length < MIN_FUZZY_WORDS) return false

  const needed = Math.ceil(quoteWords.length * MATCH_RATIO)
  const size = quoteWords.length + Math.ceil(quoteWords.length / 2)
  const starts = new Set(quoteWords.slice(0, 3))

  for (let start = 0; start < noteWords.length; start++) {
    if (!starts.has(noteWords[start])) continue
    if (inOrderMatches(quoteWords, noteWords.slice(start, start + size)) >= needed) return true
  }
  return false
}

export function checkGrounding(tree: SkillTree, notes: string): Record<string, Grounding> {
  const result: Record<string, Grounding> = {}

  for (const node of tree.nodes) {
    for (const card of node.cards) {
      result[card.id] = !card.source ? 'no_quote' : isGrounded(card.source, notes) ? 'found' : 'not_found'
    }
  }
  return result
}

export function groundingSummary(grounding: Record<string, Grounding>) {
  const values = Object.values(grounding)
  return {
    total: values.length,
    unverified: values.filter((value) => value !== 'found').length,
  }
}

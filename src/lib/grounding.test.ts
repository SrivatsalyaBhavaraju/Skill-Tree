import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkGrounding, groundingSummary, isGrounded } from './grounding'
import { readModelOutput } from './validate'

function fixture(name: string): string {
  return readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), 'utf8')
}

const notes = fixture('notes-photosynthesis.txt')

function treeFrom(name: string) {
  const result = readModelOutput(fixture(name))
  if (!result.ok) throw new Error(`${name} should be usable`)
  return result.tree
}

describe('isGrounded', () => {
  it('finds an exact quote', () => {
    expect(isGrounded('The Calvin cycle takes place in the stroma.', notes)).toBe(true)
  })

  it('ignores case, punctuation and extra spaces', () => {
    expect(isGrounded('  the CALVIN cycle — takes place in the "stroma"  ', notes)).toBe(true)
  })

  it('accepts a quote with one small change in a longer sentence', () => {
    expect(isGrounded('The enzyme RuBisCO grabs carbon dioxide in the first step of the Calvin cycle', notes)).toBe(true)
  })

  it('rejects a sentence that is not in the notes', () => {
    expect(isGrounded('The Calvin cycle is light-independent and can run in darkness.', notes)).toBe(false)
  })

  it('rejects a short quote unless it matches exactly', () => {
    expect(isGrounded('reflects green light', notes)).toBe(true)
    expect(isGrounded('reflects blue light', notes)).toBe(false)
  })

  it('tolerates one misspelled word in a longer quote', () => {
    expect(isGrounded('the Calvin cycle takes place in the strom', notes)).toBe(true)
  })

  it('matches whole words, not parts of words', () => {
    expect(isGrounded('stroma', 'The stromatolite fossils are old.')).toBe(false)
  })

  it('rejects an empty quote', () => {
    expect(isGrounded('  ...  ', notes)).toBe(false)
  })
})

describe('checkGrounding', () => {
  it('flags invented and missing quotes but accepts real ones', () => {
    const grounding = checkGrounding(treeFrom('hallucinated-sources.json'), notes)

    expect(Object.values(grounding)).toEqual(['found', 'not_found', 'not_found', 'no_quote'])
    expect(groundingSummary(grounding)).toEqual({ total: 4, unverified: 3 })
  })

  it('finds every quote in the valid tree', () => {
    const grounding = checkGrounding(treeFrom('valid-tree.json'), notes)

    expect(groundingSummary(grounding)).toEqual({ total: 10, unverified: 0 })
  })
})

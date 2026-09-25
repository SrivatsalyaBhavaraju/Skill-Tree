import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pickBackground } from './background.js'

const notes = readFileSync(new URL('../../fixtures/notes-photosynthesis.txt', import.meta.url), 'utf8')

describe('pickBackground', () => {
  it('uses the notebook for pasted notes, whatever the subject', () => {
    expect(pickBackground(notes)).toBe('notebook')
    expect(pickBackground(notes, 'math')).toBe('notebook')
  })

  it('uses graph paper for a math topic', () => {
    expect(pickBackground('Quadratic equations', 'math')).toBe('graph')
  })

  it('uses the chalkboard for a theory topic or before the subject is known', () => {
    expect(pickBackground('The French Revolution', 'theory')).toBe('chalk')
    expect(pickBackground('The French Revolution')).toBe('chalk')
  })
})

import { describe, expect, it } from 'vitest'
import { receiptLine } from './receipt'

describe('receiptLine', () => {
  it('calls a result with nothing to report clean', () => {
    expect(receiptLine({ fixed: [], dropped: [] }, false)).toEqual({
      clean: true,
      text: 'Clean result · the AI’s answer passed every check',
    })
  })

  it('counts fixes, drops and the retry', () => {
    expect(receiptLine({ fixed: ['a', 'b', 'c'], dropped: ['d', 'e'] }, true)).toEqual({
      clean: false,
      text: 'Repaired · 3 fixed · 2 dropped · 1 automatic retry',
    })
  })

  it('treats a retry alone as a repair', () => {
    expect(receiptLine({ fixed: [], dropped: [] }, true).text).toBe('Repaired · 1 automatic retry')
  })
})

import { describe, expect, it } from 'vitest'
import { isCorrect, progressReducer } from './progress'
import type { Card } from './schema'

const mcq: Card = { id: 'a#1', type: 'mcq', question: 'Q', options: ['x', 'y', 'z'], answerIndex: 1, explanation: '' }
const truefalse: Card = { id: 'a#2', type: 'truefalse', statement: 'S', answer: false, explanation: '' }
const flashcard: Card = { id: 'a#3', type: 'flashcard', front: 'F', back: 'B' }

describe('isCorrect', () => {
  it.each([
    [mcq, 1, true],
    [mcq, 0, false],
    [truefalse, false, true],
    [truefalse, true, false],
    [flashcard, true, true],
    [flashcard, false, false],
  ] as [Card, number | boolean, boolean][])('%# checks a %s answer', (card, answer, expected) => {
    expect(isCorrect(card, answer)).toBe(expected)
  })
})

describe('progressReducer', () => {
  it('records a correct and a missed answer', () => {
    const state = progressReducer(progressReducer({}, { type: 'answer', cardId: 'a#1', correct: true }), {
      type: 'answer',
      cardId: 'a#2',
      correct: false,
    })

    expect(state).toEqual({ 'a#1': 'correct', 'a#2': 'missed' })
  })

  it('clears a mistake once the card is answered correctly', () => {
    const state = progressReducer({ 'a#1': 'missed' }, { type: 'answer', cardId: 'a#1', correct: true })

    expect(state).toEqual({ 'a#1': 'correct' })
  })

  it('never takes back a card that was already answered correctly', () => {
    const before = { 'a#1': 'correct' } as const
    const after = progressReducer(before, { type: 'answer', cardId: 'a#1', correct: false })

    expect(after).toBe(before)
  })

  it('does not change the state it was given', () => {
    const before = {}
    progressReducer(before, { type: 'answer', cardId: 'a#1', correct: true })

    expect(before).toEqual({})
  })

  it('records a wrong answer given with certainty as a confident miss', () => {
    const state = progressReducer({}, { type: 'answer', cardId: 'a#1', correct: false, confidence: 'certain' })

    expect(state).toEqual({ 'a#1': 'confident_miss' })
  })

  it('treats a wrong guess as an ordinary miss', () => {
    const state = progressReducer({}, { type: 'answer', cardId: 'a#1', correct: false, confidence: 'guess' })

    expect(state).toEqual({ 'a#1': 'missed' })
  })

  it('keeps a confident miss flagged until the card is answered correctly', () => {
    const wrongAgain = progressReducer({ 'a#1': 'confident_miss' }, { type: 'answer', cardId: 'a#1', correct: false })
    const fixed = progressReducer(wrongAgain, { type: 'answer', cardId: 'a#1', correct: true })

    expect(wrongAgain).toEqual({ 'a#1': 'confident_miss' })
    expect(fixed).toEqual({ 'a#1': 'correct' })
  })

  it('resets to no progress', () => {
    expect(progressReducer({ 'a#1': 'correct' }, { type: 'reset' })).toEqual({})
  })
})

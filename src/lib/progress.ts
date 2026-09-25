import type { Card } from './schema.js'
import type { Progress } from './tree.js'

export type Answer = number | boolean

export type Confidence = 'guess' | 'fair' | 'certain'

export type ProgressAction =
  | { type: 'answer'; cardId: string; correct: boolean; confidence?: Confidence }
  | { type: 'forget'; cardId: string }
  | { type: 'reset' }

export function isCorrect(card: Card, answer: Answer): boolean {
  switch (card.type) {
    case 'mcq':
      return answer === card.answerIndex
    case 'truefalse':
      return answer === card.answer
    case 'flashcard':
      return answer === true
  }
}

export function progressReducer(state: Progress, action: ProgressAction): Progress {
  switch (action.type) {
    case 'answer': {
      const previous = state[action.cardId]
      if (previous === 'correct') return state
      if (action.correct) return { ...state, [action.cardId]: 'correct' }
      const confident = action.confidence === 'certain' || previous === 'confident_miss'
      return { ...state, [action.cardId]: confident ? 'confident_miss' : 'missed' }
    }
    case 'forget': {
      if (!(action.cardId in state)) return state
      const next = { ...state }
      delete next[action.cardId]
      return next
    }
    case 'reset':
      return {}
  }
}

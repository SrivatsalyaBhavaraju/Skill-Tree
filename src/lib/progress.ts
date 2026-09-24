import type { Card } from './schema'
import type { Progress } from './tree'

export type Answer = number | boolean

export type ProgressAction = { type: 'answer'; cardId: string; correct: boolean } | { type: 'reset' }

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
    case 'answer':
      if (state[action.cardId] === 'correct') return state
      return { ...state, [action.cardId]: action.correct ? 'correct' : 'missed' }
    case 'reset':
      return {}
  }
}

import { describe, expect, it } from 'vitest'
import { bossQuestions, formatTime, passMark } from './boss.js'
import type { Card, TopicNode } from './schema.js'

function mcq(id: string): Card {
  return { id, type: 'mcq', question: id, options: ['a', 'b', 'c'], answerIndex: 0, explanation: '' }
}

function flashcard(id: string): Card {
  return { id, type: 'flashcard', front: id, back: id }
}

function topic(id: string, cards: Card[]): TopicNode {
  return { id, label: id.toUpperCase(), summary: '', prerequisites: [], cards }
}

describe('bossQuestions', () => {
  const nodes = [
    topic('a', [mcq('a1'), flashcard('a2'), mcq('a3'), mcq('a4')]),
    topic('b', [mcq('b1')]),
    topic('c', [flashcard('c1'), mcq('c2'), mcq('c3')]),
  ]

  it('takes questions from every topic in turn, skipping flashcards', () => {
    expect(bossQuestions(nodes, 5).map((question) => question.card.id)).toEqual(['a1', 'b1', 'c2', 'a3', 'c3'])
  })

  it('stops when there are no more questions', () => {
    expect(bossQuestions(nodes, 50)).toHaveLength(6)
  })

  it('remembers which topic each question came from', () => {
    expect(bossQuestions(nodes, 2).map((question) => question.topic)).toEqual(['A', 'B'])
  })
})

describe('passMark and formatTime', () => {
  it('needs 70 % rounded up to pass', () => {
    expect(passMark(10)).toBe(7)
    expect(passMark(6)).toBe(5)
  })

  it('formats seconds as m:ss', () => {
    expect(formatTime(200)).toBe('3:20')
    expect(formatTime(9.2)).toBe('0:10')
    expect(formatTime(-3)).toBe('0:00')
  })
})

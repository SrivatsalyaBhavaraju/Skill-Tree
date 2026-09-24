import { describe, expect, it } from 'vitest'
import { missedCardIds, reviewDeck, topicDeck } from './deck'
import type { TopicNode } from './schema'

function topic(id: string, cards: number): TopicNode {
  return {
    id,
    label: id.toUpperCase(),
    summary: `About ${id}`,
    prerequisites: [],
    cards: Array.from({ length: cards }, (_, index) => ({ id: `${id}#${index + 1}`, type: 'flashcard', front: 'Q', back: 'A' })),
  }
}

const nodes = [topic('a', 2), topic('b', 3)]

describe('decks', () => {
  it('makes a deck from one topic', () => {
    const deck = topicDeck(nodes[0])

    expect(deck.title).toBe('A')
    expect(deck.cards.map((card) => card.id)).toEqual(['a#1', 'a#2'])
    expect(deck.review).toBe(false)
  })

  it('finds missed cards across topics in tree order', () => {
    const progress = { 'b#2': 'missed', 'a#2': 'missed', 'a#1': 'correct' } as const

    expect(missedCardIds(nodes, progress)).toEqual(['a#2', 'b#2'])
  })

  it('builds a review deck that remembers which topic each card is from', () => {
    const deck = reviewDeck(nodes, ['a#2', 'b#2'])

    expect(deck.cards.map((card) => card.id)).toEqual(['a#2', 'b#2'])
    expect(deck.topicOf).toEqual({ 'a#2': 'A', 'b#2': 'B' })
    expect(deck.review).toBe(true)
  })
})

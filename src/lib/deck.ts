import type { Card, TopicNode } from './schema.js'
import { isMiss, type Progress } from './tree.js'

export type Deck = {
  id: string
  title: string
  summary: string
  cards: Card[]
  topicOf: Record<string, string>
  review: boolean
}

export function topicDeck(node: TopicNode): Deck {
  return {
    id: node.id,
    title: node.label,
    summary: node.summary,
    cards: node.cards,
    topicOf: Object.fromEntries(node.cards.map((card) => [card.id, node.label])),
    review: false,
  }
}

export function missedCardIds(nodes: TopicNode[], progress: Progress): string[] {
  const missed = nodes.flatMap((node) => node.cards.filter((card) => isMiss(progress[card.id])).map((card) => card.id))
  const confident = missed.filter((id) => progress[id] === 'confident_miss')
  return [...confident, ...missed.filter((id) => progress[id] !== 'confident_miss')]
}

export function reviewDeck(nodes: TopicNode[], cardIds: string[]): Deck {
  const entries = nodes.flatMap((node) =>
    node.cards.filter((card) => cardIds.includes(card.id)).map((card) => ({ card, topic: node.label })),
  )

  return {
    id: `review:${cardIds.join(',')}`,
    title: 'Review mistakes',
    summary: 'Every card you missed, from every topic. Get one right and it leaves the list.',
    cards: cardIds.flatMap((id) => entries.find((entry) => entry.card.id === id)?.card ?? []),
    topicOf: Object.fromEntries(entries.map((entry) => [entry.card.id, entry.topic])),
    review: true,
  }
}

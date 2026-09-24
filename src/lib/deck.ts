import type { Card, TopicNode } from './schema'
import type { Progress } from './tree'

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
  return nodes.flatMap((node) => node.cards.filter((card) => progress[card.id] === 'missed').map((card) => card.id))
}

export function reviewDeck(nodes: TopicNode[], cardIds: string[]): Deck {
  const entries = nodes.flatMap((node) =>
    node.cards.filter((card) => cardIds.includes(card.id)).map((card) => ({ card, topic: node.label })),
  )

  return {
    id: `review:${cardIds.join(',')}`,
    title: 'Review mistakes',
    summary: 'Every card you missed, from every topic. Get one right and it leaves the list.',
    cards: entries.map((entry) => entry.card),
    topicOf: Object.fromEntries(entries.map((entry) => [entry.card.id, entry.topic])),
    review: true,
  }
}

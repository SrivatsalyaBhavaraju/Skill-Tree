import type { Card, TopicNode } from './schema.js'

export const BOSS_QUESTIONS = 10
export const SECONDS_PER_QUESTION = 20
export const PASS_RATIO = 0.7

export type BossQuestion = {
  card: Extract<Card, { type: 'mcq' | 'truefalse' }>
  topic: string
}

export function bossQuestions(nodes: TopicNode[], count = BOSS_QUESTIONS): BossQuestion[] {
  const pools = nodes.map((node) => ({
    topic: node.label,
    cards: node.cards.filter((card): card is BossQuestion['card'] => card.type !== 'flashcard'),
  }))

  const questions: BossQuestion[] = []
  for (let round = 0; questions.length < count; round++) {
    const picked = pools.filter((pool) => round < pool.cards.length)
    if (picked.length === 0) break

    for (const pool of picked) {
      if (questions.length === count) break
      questions.push({ card: pool.cards[round], topic: pool.topic })
    }
  }
  return questions
}

export function passMark(total: number): number {
  return Math.ceil(total * PASS_RATIO)
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

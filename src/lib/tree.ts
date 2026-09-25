import type { Card, SkillTree, TopicNode } from './schema.js'

export type CardResult = 'correct' | 'missed' | 'confident_miss'

export function isMiss(result: CardResult | undefined): boolean {
  return result === 'missed' || result === 'confident_miss'
}

export type Progress = Record<string, CardResult>

export type TopicStatus = 'done' | 'ready' | 'review' | 'locked'

export function levelsOf(nodes: TopicNode[]): TopicNode[][] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const levels = new Map<string, number>()

  function levelOf(node: TopicNode): number {
    const known = levels.get(node.id)
    if (known !== undefined) return known

    const level = node.prerequisites.reduce((deepest, id) => {
      const prerequisite = byId.get(id)
      return prerequisite ? Math.max(deepest, levelOf(prerequisite) + 1) : deepest
    }, 0)

    levels.set(node.id, level)
    return level
  }

  const rows: TopicNode[][] = []
  for (const node of nodes) {
    const level = levelOf(node)
    rows[level] = [...(rows[level] ?? []), node]
  }
  return rows.filter((row) => row !== undefined)
}

export function countCards(node: TopicNode, progress: Progress) {
  const correct = node.cards.filter((card) => progress[card.id] === 'correct').length
  const missed = node.cards.filter((card) => isMiss(progress[card.id])).length
  const confident = node.cards.filter((card) => progress[card.id] === 'confident_miss').length
  return { total: node.cards.length, correct, missed, confident, left: node.cards.length - correct }
}

export function isComplete(node: TopicNode, progress: Progress): boolean {
  return node.cards.every((card) => progress[card.id] === 'correct')
}

export function topicStatus(node: TopicNode, nodes: TopicNode[], progress: Progress): TopicStatus {
  const unlocked = node.prerequisites.every((id) => {
    const prerequisite = nodes.find((other) => other.id === id)
    return prerequisite !== undefined && isComplete(prerequisite, progress)
  })

  if (!unlocked) return 'locked'
  if (isComplete(node, progress)) return 'done'
  return countCards(node, progress).missed > 0 ? 'review' : 'ready'
}

export function statusText(node: TopicNode, nodes: TopicNode[], progress: Progress): string {
  const status = topicStatus(node, nodes, progress)
  const { total, correct, missed, confident, left } = countCards(node, progress)

  switch (status) {
    case 'done':
      return `Completed · ${total} cards`
    case 'review':
      return `Review ${missed} missed card${missed === 1 ? '' : 's'}${confident > 0 ? ` · ${confident} you were sure of` : ''}`
    case 'ready':
      return correct === 0 ? `Start · ${total} cards` : `In progress · ${left} left`
    case 'locked': {
      const waiting = nodes.filter((other) => node.prerequisites.includes(other.id) && !isComplete(other, progress))
      return waiting.length === 1 ? `Locked · finish ${waiting[0].label} first` : `Locked · finish ${waiting.length} topics first`
    }
  }
}

export function nextTopic(nodes: TopicNode[], progress: Progress): TopicNode | null {
  const statuses = nodes.map((node) => ({ node, status: topicStatus(node, nodes, progress) }))
  const pick = statuses.find(({ status }) => status === 'review') ?? statuses.find(({ status }) => status === 'ready')
  return pick?.node ?? null
}

export function summarize(nodes: TopicNode[], progress: Progress) {
  const counts = nodes.map((node) => countCards(node, progress))
  const sum = (key: 'total' | 'correct' | 'missed') => counts.reduce((total, count) => total + count[key], 0)

  return {
    topics: nodes.length,
    topicsDone: nodes.filter((node) => isComplete(node, progress)).length,
    cards: sum('total'),
    correct: sum('correct'),
    missed: sum('missed'),
  }
}

export function applyFixes(tree: SkillTree, fixes: Record<string, Card>): SkillTree {
  if (Object.keys(fixes).length === 0) return tree

  return {
    ...tree,
    nodes: tree.nodes.map((node) => ({
      ...node,
      cards: node.cards.map((card) => fixes[card.id] ?? card),
    })),
  }
}

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { TopicNode } from './schema.js'
import { applyFixes, levelsOf, nextTopic, statusText, summarize, topicStatus, type Progress } from './tree.js'
import { readModelOutput } from './validate.js'

function photosynthesis(): TopicNode[] {
  const result = readModelOutput(readFileSync(new URL('../../fixtures/valid-tree.json', import.meta.url), 'utf8'))
  if (!result.ok) throw new Error('fixture should be valid')
  return result.tree.nodes
}

function topic(id: string, prerequisites: string[] = [], cards = 2): TopicNode {
  return {
    id,
    label: id.toUpperCase(),
    summary: '',
    prerequisites,
    cards: Array.from({ length: cards }, (_, index) => ({ id: `${id}#${index + 1}`, type: 'flashcard', front: 'Q', back: 'A' })),
  }
}

function allCorrect(...nodes: TopicNode[]): Progress {
  return Object.fromEntries(nodes.flatMap((node) => node.cards.map((card) => [card.id, 'correct'])))
}

describe('levelsOf', () => {
  it('puts each topic one level below its deepest prerequisite', () => {
    const rows = levelsOf(photosynthesis())

    expect(rows.map((row) => row.map((node) => node.id))).toEqual([
      ['chloroplast'],
      ['light-reactions'],
      ['calvin-cycle'],
      ['limiting-factors'],
    ])
  })

  it('keeps side-by-side topics in their original order', () => {
    const rows = levelsOf([topic('a'), topic('c', ['a']), topic('b', ['a']), topic('d')])

    expect(rows.map((row) => row.map((node) => node.id))).toEqual([['a', 'd'], ['c', 'b']])
  })
})

describe('topicStatus', () => {
  const a = topic('a')
  const b = topic('b', ['a'])
  const nodes = [a, b]

  it('starts with root topics ready and the rest locked', () => {
    expect(topicStatus(a, nodes, {})).toBe('ready')
    expect(topicStatus(b, nodes, {})).toBe('locked')
  })

  it('marks a topic for review when it has a missed card', () => {
    expect(topicStatus(a, nodes, { 'a#1': 'correct', 'a#2': 'missed' })).toBe('review')
  })

  it('completes a topic and unlocks what needs it once every card is correct', () => {
    const progress = allCorrect(a)

    expect(topicStatus(a, nodes, progress)).toBe('done')
    expect(topicStatus(b, nodes, progress)).toBe('ready')
  })

  it('keeps a topic locked until every prerequisite is complete', () => {
    const c = topic('c', ['a', 'b'])

    expect(topicStatus(c, [a, b, c], allCorrect(a))).toBe('locked')
    expect(topicStatus(c, [a, b, c], allCorrect(a, b))).toBe('ready')
  })
})

describe('statusText', () => {
  const a = topic('a', [], 3)
  const b = topic('b', ['a'])
  const nodes = [a, b]

  it.each([
    [{}, 'Start · 3 cards'],
    [{ 'a#1': 'correct' }, 'In progress · 2 left'],
    [{ 'a#1': 'missed' }, 'Review 1 missed card'],
    [{ 'a#1': 'confident_miss', 'a#2': 'missed' }, 'Review 2 missed cards · 1 you were sure of'],
    [allCorrect(a), 'Completed · 3 cards'],
  ] as [Progress, string][])('describes topic a with %j as "%s"', (progress, text) => {
    expect(statusText(a, nodes, progress)).toBe(text)
  })

  it('says which topic to finish first', () => {
    expect(statusText(b, nodes, {})).toBe('Locked · finish A first')
  })
})

describe('nextTopic and summarize', () => {
  const a = topic('a')
  const b = topic('b')
  const c = topic('c', ['a'])

  it('suggests topics with mistakes before new ones', () => {
    expect(nextTopic([a, b, c], {})?.id).toBe('a')
    expect(nextTopic([a, b, c], { 'b#1': 'missed' })?.id).toBe('b')
  })

  it('suggests nothing when everything is complete', () => {
    expect(nextTopic([a, c], allCorrect(a, c))).toBeNull()
  })

  it('counts topics and cards', () => {
    expect(summarize([a, b, c], { ...allCorrect(a), 'b#1': 'missed' })).toEqual({
      topics: 3,
      topicsDone: 1,
      cards: 6,
      correct: 2,
      missed: 1,
    })
  })
})

describe('applyFixes', () => {
  const tree = { title: 'T', subject: 'theory' as const, nodes: [topic('a'), topic('b')] }

  it('replaces only the fixed card and keeps everything else', () => {
    const fixed = { id: 'b#2', type: 'flashcard' as const, front: 'New Q', back: 'New A' }
    const result = applyFixes(tree, { 'b#2': fixed })

    expect(result.nodes[1].cards[1]).toBe(fixed)
    expect(result.nodes[1].cards[0]).toBe(tree.nodes[1].cards[0])
    expect(result.nodes[0].cards).toEqual(tree.nodes[0].cards)
  })

  it('returns the same tree when there is nothing to fix', () => {
    expect(applyFixes(tree, {})).toBe(tree)
  })
})

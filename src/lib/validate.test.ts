import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readModelOutput, validateTree, type ValidationResult } from './validate'

function fixture(name: string): string {
  return readFileSync(new URL(`../../fixtures/${name}`, import.meta.url), 'utf8')
}

function success(result: ValidationResult) {
  if (!result.ok) {
    throw new Error(`Expected a tree, got ${result.kind}: ${result.message}`)
  }
  return result
}

function topic(result: ValidationResult, id: string) {
  const found = success(result).tree.nodes.find((node) => node.id === id)
  if (!found) throw new Error(`No topic with id "${id}"`)
  return found
}

describe('valid output', () => {
  const result = readModelOutput(fixture('valid-tree.json'))

  it('keeps every topic and card with an empty report', () => {
    const { tree, report } = success(result)

    expect(tree.title).toBe('Photosynthesis')
    expect(tree.nodes).toHaveLength(4)
    expect(tree.nodes.flatMap((node) => node.cards)).toHaveLength(10)
    expect(report).toEqual({ fixed: [], dropped: [] })
  })

  it('gives each card an id based on its topic', () => {
    expect(topic(result, 'calvin-cycle').cards.map((card) => card.id)).toEqual(['calvin-cycle#1', 'calvin-cycle#2'])
  })

  it('returns the same tree when a validated tree is validated again', () => {
    const { tree } = success(result)
    const again = success(validateTree(JSON.parse(JSON.stringify(tree))))

    expect(again.tree).toEqual(tree)
    expect(again.report).toEqual({ fixed: [], dropped: [] })
  })
})

describe('outputs that cannot be used', () => {
  it.each([
    ['empty.txt', 'empty'],
    ['empty-nodes.json', 'empty'],
    ['malformed-truncated.txt', 'malformed'],
    ['wrong-shape.json', 'wrong_shape'],
  ])('%s fails as %s', (name, kind) => {
    const result = readModelOutput(fixture(name))

    expect(result.ok).toBe(false)
    expect(!result.ok && result.kind).toBe(kind)
  })

  it('fails when every topic is broken, listing why', () => {
    const result = validateTree({ title: 'X', nodes: [{ label: 'Only topic', cards: [{ type: 'essay' }] }] })

    expect(result.ok).toBe(false)
    expect(!result.ok && result.details).toEqual([
      '"Only topic" card 1: unknown card type "essay"',
      '"Only topic": no valid cards, topic removed',
    ])
  })

  it.each([null, 42, 'text', [], { nodes: 'not a list' }, { nodes: [null, 7, 'x'] }])(
    'never throws on %j',
    (junk) => {
      expect(() => validateTree(junk)).not.toThrow()
      expect(validateTree(junk).ok).toBe(false)
    },
  )
})

describe('salvaging broken output', () => {
  it('strips prose and a markdown fence around the JSON', () => {
    const { tree, report } = success(readModelOutput(fixture('markdown-fenced.txt')))

    expect(tree.nodes).toHaveLength(1)
    expect(report.fixed).toEqual(['Removed extra text around the JSON'])
  })

  it('repairs or drops each bad multiple-choice card on its own', () => {
    const result = readModelOutput(fixture('bad-mcq.json'))
    const cards = topic(result, 'light-reactions').cards

    expect(cards.map((card) => card.type)).toEqual(['mcq', 'flashcard'])
    expect(success(result).report.dropped).toHaveLength(2)
  })

  it('moves the answer index when a duplicate option before it is removed', () => {
    const [mcq] = topic(readModelOutput(fixture('bad-mcq.json')), 'light-reactions').cards

    expect(mcq.type === 'mcq' && mcq.options).toEqual(['ATP and NADPH', 'Glucose', 'Starch', 'Oxygen and glucose'])
    expect(mcq.type === 'mcq' && mcq.options[mcq.answerIndex]).toBe('ATP and NADPH')
  })

  it('renames a duplicate topic id instead of losing the topic', () => {
    const { tree } = success(readModelOutput(fixture('duplicate-ids.json')))

    expect(tree.nodes.map((node) => node.id)).toEqual(['chloroplast', 'chloroplast-2'])
  })

  it('removes links to missing topics, repeated links and self-links', () => {
    const result = readModelOutput(fixture('missing-prerequisite.json'))

    expect(topic(result, 'light-reactions').prerequisites).toEqual([])
    expect(topic(result, 'calvin-cycle').prerequisites).toEqual(['light-reactions'])
    expect(success(result).report.fixed).toHaveLength(3)
  })

  it('breaks a prerequisite loop by removing the link that points forward', () => {
    const result = readModelOutput(fixture('cycle.json'))

    expect(topic(result, 'light-reactions').prerequisites).toEqual(['chloroplast'])
    expect(topic(result, 'calvin-cycle').prerequisites).toEqual(['light-reactions'])
  })

  it('drops a topic with no valid cards and unlinks the topics that needed it', () => {
    const result = readModelOutput(fixture('topic-without-valid-cards.json'))
    const { tree, report } = success(result)

    expect(tree.nodes.map((node) => node.id)).toEqual(['chloroplast', 'calvin-cycle'])
    expect(topic(result, 'calvin-cycle').prerequisites).toEqual([])
    expect(report.dropped).toContain('"Light Reactions": no valid cards, topic removed')
  })

  it('salvages a partially broken tree', () => {
    const result = readModelOutput(fixture('partially-broken.json'))
    const { tree, report } = success(result)

    expect(tree.title).toBe('Photosynthesis')
    expect(tree.nodes.map((node) => node.id)).toEqual([
      'chloroplast',
      'light-reactions',
      'calvin-cycle',
      'limiting-factors',
    ])
    expect(topic(result, 'light-reactions').cards).toHaveLength(1)
    expect(topic(result, 'light-reactions').prerequisites).toEqual(['chloroplast'])
    expect(topic(result, 'calvin-cycle').prerequisites).toEqual(['light-reactions'])
    expect(report.fixed).toHaveLength(3)
    expect(report.dropped).toHaveLength(2)
  })

  it('turns "true" and "false" text answers into booleans', () => {
    const result = validateTree({
      title: 'X',
      nodes: [{ id: 'a', label: 'A', cards: [{ type: 'truefalse', statement: 'S', answer: 'false' }] }],
    })
    const [card] = topic(result, 'a').cards

    expect(card.type === 'truefalse' && card.answer).toBe(false)
  })

  it('trims trees and topics that are too big', () => {
    const cards = Array.from({ length: 9 }, (_, index) => ({ type: 'flashcard', front: `Q${index}`, back: 'A' }))
    const nodes = Array.from({ length: 11 }, (_, index) => ({ id: `t${index}`, label: `T${index}`, cards }))
    const { tree } = success(validateTree({ title: 'Big', nodes }))

    expect(tree.nodes).toHaveLength(8)
    expect(tree.nodes[0].cards).toHaveLength(6)
  })
})

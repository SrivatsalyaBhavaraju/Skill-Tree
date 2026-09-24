export type FlashCard = {
  type: 'flashcard'
  front: string
  back: string
}

export type McqCard = {
  type: 'mcq'
  question: string
  options: string[]
  answerIndex: number
  explanation: string
}

export type TrueFalseCard = {
  type: 'truefalse'
  statement: string
  answer: boolean
  explanation: string
}

export type CardContent = FlashCard | McqCard | TrueFalseCard

export type CardType = CardContent['type']

export type Card = CardContent & {
  id: string
  source?: string
}

export type TopicNode = {
  id: string
  label: string
  summary: string
  prerequisites: string[]
  cards: Card[]
}

export type SkillTree = {
  title: string
  nodes: TopicNode[]
}

export const LIMITS = {
  minTopics: 3,
  maxTopics: 8,
  minCards: 2,
  maxCards: 6,
  minOptions: 3,
  maxOptions: 5,
  notesMinChars: 200,
} as const

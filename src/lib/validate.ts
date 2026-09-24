import { LIMITS, SUBJECTS, type CardContent, type SkillTree, type Subject, type TopicNode } from './schema'

export type FailureKind = 'empty' | 'malformed' | 'wrong_shape'

export type RepairReport = {
  fixed: string[]
  dropped: string[]
}

export type Failure = {
  ok: false
  kind: FailureKind
  message: string
  details: string[]
}

export type ParseResult = { ok: true; data: unknown; fixed: string[] } | Failure

export type ValidationResult = { ok: true; tree: SkillTree; report: RepairReport } | Failure

type CardDraft = CardContent & { source?: string }

type TopicDraft = Omit<TopicNode, 'cards'> & { cards: CardDraft[] }

const MIN_OPTIONS = 2

function fail(kind: FailureKind, message: string, details: string[] = []): Failure {
  return { ok: false, kind, message, details }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text === '' ? null : text
}

function sameText(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function tryParse(text: string): { value: unknown } | null {
  try {
    return { value: JSON.parse(text) }
  } catch {
    return null
  }
}

export function parseModelText(text: string): ParseResult {
  const trimmed = text.trim()
  if (trimmed === '') {
    return fail('empty', 'The model returned an empty response.')
  }

  const direct = tryParse(trimmed)
  if (direct) {
    return { ok: true, data: direct.value, fixed: [] }
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  const inner = start !== -1 && end > start ? tryParse(trimmed.slice(start, end + 1)) : null
  if (inner) {
    return { ok: true, data: inner.value, fixed: ['Removed extra text around the JSON'] }
  }

  return fail('malformed', 'The model returned broken or incomplete JSON.', [
    'The response could not be parsed as JSON',
  ])
}

function readFlashcard(raw: Record<string, unknown>): CardContent | string {
  const front = cleanText(raw.front)
  const back = cleanText(raw.back)
  if (!front || !back) return 'flashcard is missing its front or back'

  return { type: 'flashcard', front, back }
}

function readTrueFalse(raw: Record<string, unknown>, where: string, report: RepairReport): CardContent | string {
  const statement = cleanText(raw.statement)
  if (!statement) return 'true/false card has no statement'

  let answer = raw.answer
  if (answer === 'true' || answer === 'false') {
    answer = answer === 'true'
    report.fixed.push(`${where}: answer was the text "${raw.answer}", turned into ${answer}`)
  }
  if (typeof answer !== 'boolean') return 'true/false answer is not true or false'

  return { type: 'truefalse', statement, answer, explanation: cleanText(raw.explanation) ?? '' }
}

function readMcq(raw: Record<string, unknown>, where: string, report: RepairReport): CardContent | string {
  const question = cleanText(raw.question)
  if (!question) return 'multiple-choice card has no question'
  if (!Array.isArray(raw.options)) return 'multiple-choice options are not a list'

  const answerIndex = raw.answerIndex
  if (
    typeof answerIndex !== 'number' ||
    !Number.isInteger(answerIndex) ||
    answerIndex < 0 ||
    answerIndex >= raw.options.length
  ) {
    return `answer index ${String(answerIndex)} does not point to one of the ${raw.options.length} options`
  }

  const correct = cleanText(raw.options[answerIndex])
  if (!correct) return 'the correct option is empty'

  const options: string[] = []
  for (const option of raw.options) {
    const text = cleanText(option)
    if (text && !options.some((kept) => sameText(kept, text))) {
      options.push(text)
    }
  }

  if (options.length < MIN_OPTIONS) return `only ${options.length} distinct option left`
  if (options.length < raw.options.length) {
    report.fixed.push(`${where}: removed ${raw.options.length - options.length} duplicate or empty option(s)`)
  }

  return {
    type: 'mcq',
    question,
    options,
    answerIndex: options.findIndex((option) => sameText(option, correct)),
    explanation: cleanText(raw.explanation) ?? '',
  }
}

function readCardContent(raw: Record<string, unknown>, where: string, report: RepairReport): CardContent | string {
  switch (raw.type) {
    case 'flashcard':
      return readFlashcard(raw)
    case 'mcq':
      return readMcq(raw, where, report)
    case 'truefalse':
      return readTrueFalse(raw, where, report)
    default:
      return `unknown card type "${String(raw.type)}"`
  }
}

function readCard(raw: unknown, where: string, report: RepairReport): CardDraft | null {
  if (!isRecord(raw)) {
    report.dropped.push(`${where}: not a valid card`)
    return null
  }

  const content = readCardContent(raw, where, report)
  if (typeof content === 'string') {
    report.dropped.push(`${where}: ${content}`)
    return null
  }

  const source = cleanText(raw.source)
  return source ? { ...content, source } : content
}

function readPrerequisites(value: unknown, name: string, report: RepairReport): string[] {
  if (value === undefined) return []

  const list = typeof value === 'string' ? [value] : value
  if (!Array.isArray(list)) {
    report.fixed.push(`${name}: prerequisites were not a list, removed them`)
    return []
  }
  if (list !== value) {
    report.fixed.push(`${name}: prerequisites were a single value, turned into a list`)
  }

  const ids = list.map(cleanText).filter((id): id is string => id !== null)
  if (ids.length < list.length) {
    report.fixed.push(`${name}: removed ${list.length - ids.length} invalid prerequisite(s)`)
  }
  return ids
}

function readTopic(raw: unknown, position: number, report: RepairReport): TopicDraft | null {
  if (!isRecord(raw)) {
    report.dropped.push(`Topic ${position + 1}: not a valid topic`)
    return null
  }

  const label = cleanText(raw.label) ?? cleanText(raw.id)
  if (!label) {
    report.dropped.push(`Topic ${position + 1}: has no name`)
    return null
  }
  const name = `"${label}"`

  const rawCards = Array.isArray(raw.cards) ? raw.cards : []
  const cards = rawCards
    .map((card, index) => readCard(card, `${name} card ${index + 1}`, report))
    .filter((card): card is CardDraft => card !== null)

  if (cards.length === 0) {
    report.dropped.push(`${name}: no valid cards, topic removed`)
    return null
  }
  if (cards.length > LIMITS.maxCards) {
    report.fixed.push(`${name}: kept the first ${LIMITS.maxCards} of ${cards.length} cards`)
    cards.splice(LIMITS.maxCards)
  }

  let id = cleanText(raw.id)
  if (!id) {
    id = slugify(label) || `topic-${position + 1}`
    report.fixed.push(`${name}: had no id, gave it "${id}"`)
  }

  let summary = cleanText(raw.summary)
  if (summary === null) {
    summary = ''
    report.fixed.push(`${name}: summary was missing, left it blank`)
  }

  return {
    id,
    label,
    summary,
    prerequisites: readPrerequisites(raw.prerequisites, name, report),
    cards,
  }
}

function readSubject(value: unknown, report: RepairReport): Subject {
  const subject = SUBJECTS.find((name) => name === cleanText(value)?.toLowerCase())
  if (subject) return subject

  report.fixed.push(
    value === undefined ? 'The tree had no subject, treated it as theory' : `Unknown subject "${String(value)}", treated it as theory`,
  )
  return 'theory'
}

function renameDuplicateIds(topics: TopicDraft[], report: RepairReport): void {
  const seen = new Set<string>()

  for (const topic of topics) {
    if (seen.has(topic.id)) {
      let suffix = 2
      while (seen.has(`${topic.id}-${suffix}`)) suffix++

      const newId = `${topic.id}-${suffix}`
      report.fixed.push(`"${topic.label}": id "${topic.id}" was already used, renamed to "${newId}"`)
      topic.id = newId
    }
    seen.add(topic.id)
  }
}

function cleanLinks(topics: TopicDraft[], report: RepairReport): void {
  const ids = new Set(topics.map((topic) => topic.id))

  for (const topic of topics) {
    const kept: string[] = []

    for (const id of topic.prerequisites) {
      if (id === topic.id) {
        report.fixed.push(`"${topic.label}": removed a link to itself`)
      } else if (!ids.has(id)) {
        report.fixed.push(`"${topic.label}": removed link to unknown topic "${id}"`)
      } else if (kept.includes(id)) {
        report.fixed.push(`"${topic.label}": removed repeated link to "${id}"`)
      } else {
        kept.push(id)
      }
    }

    topic.prerequisites = kept
  }
}

function breakCycles(topics: TopicDraft[], report: RepairReport): void {
  const byId = new Map(topics.map((topic) => [topic.id, topic]))
  const state = new Map<string, 'visiting' | 'done'>()

  function visit(topic: TopicDraft): void {
    state.set(topic.id, 'visiting')

    for (const prerequisiteId of [...topic.prerequisites]) {
      const prerequisite = byId.get(prerequisiteId)!
      const prerequisiteState = state.get(prerequisiteId)

      if (prerequisiteState === 'visiting') {
        topic.prerequisites = topic.prerequisites.filter((id) => id !== prerequisiteId)
        report.fixed.push(`"${topic.label}": removed link to "${prerequisite.label}" to break a prerequisite loop`)
      } else if (prerequisiteState === undefined) {
        visit(prerequisite)
      }
    }

    state.set(topic.id, 'done')
  }

  for (const topic of [...topics].reverse()) {
    if (!state.has(topic.id)) visit(topic)
  }
}

export function validateTree(data: unknown): ValidationResult {
  if (!isRecord(data) || !Array.isArray(data.nodes)) {
    return fail('wrong_shape', 'The response did not have the expected structure.', [
      'Expected an object with a "nodes" list',
    ])
  }
  if (data.nodes.length === 0) {
    return fail('empty', 'The response contained no topics.')
  }

  const report: RepairReport = { fixed: [], dropped: [] }

  let title = cleanText(data.title)
  if (!title) {
    title = 'Study Tree'
    report.fixed.push('The tree had no title, called it "Study Tree"')
  }

  const subject = readSubject(data.subject, report)

  const topics = data.nodes
    .map((raw, position) => readTopic(raw, position, report))
    .filter((topic): topic is TopicDraft => topic !== null)

  if (topics.length === 0) {
    return fail('wrong_shape', 'None of the topics in the response were usable.', report.dropped)
  }
  if (topics.length > LIMITS.maxTopics) {
    report.fixed.push(`Kept the first ${LIMITS.maxTopics} of ${topics.length} topics`)
    topics.splice(LIMITS.maxTopics)
  }

  renameDuplicateIds(topics, report)
  cleanLinks(topics, report)
  breakCycles(topics, report)

  const nodes: TopicNode[] = topics.map((topic) => ({
    ...topic,
    cards: topic.cards.map((card, index) => ({ ...card, id: `${topic.id}#${index + 1}` })),
  }))

  return { ok: true, tree: { title, subject, nodes }, report }
}

export function readModelOutput(text: string): ValidationResult {
  const parsed = parseModelText(text)
  if (!parsed.ok) return parsed

  const result = validateTree(parsed.data)
  if (!result.ok) return result

  result.report.fixed.unshift(...parsed.fixed)
  return result
}

import { useEffect, useState } from 'react'
import type { ErrorKind } from '../lib/errors'
import { createRequester } from '../lib/requester'
import type { SkillTree } from '../lib/schema'
import type { RepairReport } from '../lib/validate'

export type GenerateState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; input: string; tree: SkillTree; report: RepairReport }
  | { status: 'error'; kind: ErrorKind; message: string }

export function useGenerateTree() {
  const [state, setState] = useState<GenerateState>({ status: 'idle' })
  const [requester] = useState(createRequester)

  useEffect(() => () => requester.cancel(), [requester])

  async function generate(text: string) {
    setState({ status: 'loading' })

    const outcome = await requester.run(text)
    if (outcome.stale) return

    const { result } = outcome
    if (result.ok) {
      setState({ status: 'success', input: text, tree: result.tree, report: result.report })
    } else if (result.kind !== 'cancelled') {
      setState({ status: 'error', kind: result.kind, message: result.message })
    }
  }

  return { state, generate }
}

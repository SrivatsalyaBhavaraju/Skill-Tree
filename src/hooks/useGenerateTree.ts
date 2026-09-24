import { useEffect, useState } from 'react'
import type { ChaosScenario } from '../lib/chaos'
import type { ErrorKind } from '../lib/errors'
import { createRequester } from '../lib/requester'
import type { SkillTree } from '../lib/schema'
import type { RepairReport } from '../lib/validate'

export type GenerateState =
  | { status: 'idle' }
  | { status: 'loading'; input: string }
  | { status: 'success'; input: string; tree: SkillTree; report: RepairReport; repaired: boolean }
  | { status: 'error'; input: string; kind: ErrorKind; message: string }

export function useGenerateTree() {
  const [state, setState] = useState<GenerateState>({ status: 'idle' })
  const [requester] = useState(createRequester)

  useEffect(() => () => requester.cancel(), [requester])

  async function generate(text: string, chaos?: ChaosScenario) {
    setState({ status: 'loading', input: text })

    const outcome = await requester.run(text, chaos)
    if (outcome.stale) return

    const { result } = outcome
    if (result.ok) {
      setState({ status: 'success', input: text, tree: result.tree, report: result.report, repaired: result.repaired })
    } else if (result.kind !== 'cancelled') {
      setState({ status: 'error', input: text, kind: result.kind, message: result.message })
    }
  }

  function cancel() {
    requester.cancel()
    setState({ status: 'idle' })
  }

  return { state, generate, cancel }
}

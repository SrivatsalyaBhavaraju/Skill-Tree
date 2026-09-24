import { useState } from 'react'
import { requestTree } from '../lib/api'
import type { ErrorKind } from '../lib/errors'
import type { SkillTree } from '../lib/schema'
import type { RepairReport } from '../lib/validate'

export type GenerateState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; tree: SkillTree; report: RepairReport }
  | { status: 'error'; kind: ErrorKind; message: string }

export function useGenerateTree() {
  const [state, setState] = useState<GenerateState>({ status: 'idle' })

  async function generate(text: string) {
    setState({ status: 'loading' })

    const result = await requestTree(text)

    if (result.ok) {
      setState({ status: 'success', tree: result.tree, report: result.report })
    } else {
      setState({ status: 'error', kind: result.kind, message: result.message })
    }
  }

  return { state, generate }
}

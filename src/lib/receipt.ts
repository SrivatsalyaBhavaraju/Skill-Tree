import type { RepairReport } from './validate'

export const CHECKS = [
  'Valid JSON',
  'Expected shape',
  'Required fields',
  'Answer indexes',
  'Duplicate options',
  'Duplicate topic IDs',
  'Links to missing topics',
  'Prerequisite loops',
  'Size limits',
]

export function receiptLine(report: RepairReport, repaired: boolean, unverified = 0): { clean: boolean; text: string } {
  const parts = [
    report.fixed.length > 0 && `${report.fixed.length} fixed`,
    report.dropped.length > 0 && `${report.dropped.length} dropped`,
    repaired && '1 automatic retry',
    unverified > 0 && `${unverified} not found in your notes`,
  ].filter((part): part is string => typeof part === 'string')

  return parts.length === 0
    ? { clean: true, text: 'Clean result · the AI’s answer passed every check' }
    : { clean: false, text: `Repaired · ${parts.join(' · ')}` }
}

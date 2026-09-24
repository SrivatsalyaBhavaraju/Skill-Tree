import { groundingSummary, type Grounding } from '../lib/grounding'
import { CHECKS, receiptLine } from '../lib/receipt'
import type { RepairReport as Report } from '../lib/validate'
import './RepairReport.css'

type Props = {
  report: Report
  repaired: boolean
  grounding: Record<string, Grounding> | null
}

function groundingText(grounding: Record<string, Grounding> | null): string {
  if (!grounding) return 'Skipped: this tree was built from a topic, not from your notes, so there is nothing to quote.'
  const { total, unverified } = groundingSummary(grounding)
  if (unverified === 0) return `All ${total} cards quote your notes, and every quote was found in them.`
  return `${unverified} of ${total} cards have a quote that is missing or not in your notes. They are marked “Not found in your notes” while you study.`
}

export function RepairReport({ report, repaired, grounding }: Props) {
  const unverified = grounding ? groundingSummary(grounding).unverified : 0
  const line = receiptLine(report, repaired, unverified)

  return (
    <details className={line.clean ? 'receipt receipt--clean' : 'receipt receipt--repaired'}>
      <summary className="receipt__summary">
        <span className="receipt__dot" aria-hidden="true" />
        <span className="receipt__line">{line.text}</span>
        <span className="receipt__toggle">Repair report</span>
      </summary>

      <div className="receipt__body">
        {repaired && (
          <section>
            <h3>Automatic retry</h3>
            <p>The first answer was unusable, so it was sent back to the AI once with the exact problems. The second answer was used.</p>
          </section>
        )}

        {report.fixed.length > 0 && (
          <section>
            <h3>Fixed automatically</h3>
            <ul>
              {report.fixed.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {report.dropped.length > 0 && (
          <section>
            <h3>Dropped</h3>
            <ul>
              {report.dropped.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3>Hallucination check</h3>
          <p>{groundingText(grounding)}</p>
        </section>

        <section>
          <h3>Checked on the server and again in your browser</h3>
          <p className="receipt__checks">
            {CHECKS.map((check) => (
              <span key={check}>{check}</span>
            ))}
          </p>
        </section>
      </div>
    </details>
  )
}

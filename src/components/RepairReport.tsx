import { CHECKS, receiptLine } from '../lib/receipt'
import type { RepairReport as Report } from '../lib/validate'
import './RepairReport.css'

type Props = {
  report: Report
  repaired: boolean
}

export function RepairReport({ report, repaired }: Props) {
  const line = receiptLine(report, repaired)

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

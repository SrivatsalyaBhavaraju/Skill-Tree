import type { Grounding } from '../lib/grounding'

type Props = {
  quote: string | undefined
  grounding: Grounding | undefined
  revealed: boolean
}

export function Source({ quote, grounding, revealed }: Props) {
  const found = grounding === 'found'

  return (
    <div className={found ? 'source' : 'source source--flagged'}>
      {!found && <span className="source__badge">Not found in your notes</span>}
      {quote && revealed && (
        <blockquote className="source__quote">
          <span className="source__label">{found ? 'From your notes' : 'The card claims your notes say'}</span>“{quote}”
        </blockquote>
      )}
      {!quote && <p className="source__missing">This card gave no quote from your notes.</p>}
    </div>
  )
}

import sampleNotes from '../../fixtures/notes-photosynthesis.txt?raw'
import './Examples.css'

type Example = {
  kind: string
  label: string
  text: string
}

const EXAMPLES: Example[] = [
  {
    kind: 'Theory topic',
    label: 'The French Revolution',
    text: 'The French Revolution',
  },
  {
    kind: 'Math topic',
    label: 'Quadratic equations',
    text: 'Quadratic equations',
  },
  {
    kind: 'Your notes',
    label: 'Sample notes: photosynthesis',
    text: sampleNotes.trim(),
  },
]

type Props = {
  onPick: (text: string) => void
}

export function Examples({ onPick }: Props) {
  return (
    <section className="examples" aria-labelledby="examples-title">
      <h2 id="examples-title" className="examples__title">
        Not sure where to start? Try one.
      </h2>
      <div className="examples__list">
        {EXAMPLES.map((example) => (
          <button key={example.label} type="button" className="example" onClick={() => onPick(example.text)}>
            <span className="example__kind">{example.kind}</span>
            <span className="example__label">{example.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

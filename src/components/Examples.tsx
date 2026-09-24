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
    label: 'Sample notes: the water cycle',
    text: [
      'The water cycle moves water between the oceans, the air and the land.',
      'Evaporation turns liquid water from oceans and lakes into water vapour, powered by heat from the sun.',
      'Transpiration is water vapour released by plants through their leaves.',
      'Condensation happens when water vapour cools and forms tiny droplets, which gather as clouds.',
      'Precipitation is water falling back to the ground as rain, snow, sleet or hail.',
      'Collection is when water gathers in rivers, lakes, oceans and underground as groundwater.',
    ].join(' '),
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

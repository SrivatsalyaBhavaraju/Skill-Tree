type Choice = {
  label: string
  key: string
}

type Props = {
  prompt: string
  choices: Choice[]
  correctIndex: number
  picked: number | undefined
  explanation: string
  onPick: (index: number) => void
}

function choiceClass(index: number, picked: number | undefined, correctIndex: number): string {
  if (picked === undefined) return 'choice'
  if (index === correctIndex) return 'choice choice--correct'
  if (index === picked) return 'choice choice--wrong'
  return 'choice choice--faded'
}

export function Choices({ prompt, choices, correctIndex, picked, explanation, onPick }: Props) {
  const answered = picked !== undefined
  const right = picked === correctIndex

  return (
    <div className="question">
      <p className="question__text">{prompt}</p>

      <div className="question__choices" role="group" aria-label="Answers">
        {choices.map((choice, index) => (
          <button
            key={choice.label}
            type="button"
            className={choiceClass(index, picked, correctIndex)}
            onClick={() => onPick(index)}
            disabled={answered}
            aria-pressed={picked === index}
          >
            <kbd className="choice__key">{choice.key}</kbd>
            <span className="choice__label">{choice.label}</span>
          </button>
        ))}
      </div>

      {answered && (
        <div className={right ? 'feedback feedback--right' : 'feedback feedback--wrong'} role="status">
          <strong>{right ? 'Correct.' : `Not quite. The answer is “${choices[correctIndex].label}”.`}</strong>
          {explanation && <p>{explanation}</p>}
        </div>
      )}
    </div>
  )
}

import type { ErrorKind } from './errors'

export type ErrorCopy = {
  title: string
  hint: string
  canRetry: boolean
}

export const ERROR_COPY: Record<ErrorKind, ErrorCopy> = {
  bad_input: {
    title: 'Check your text',
    hint: 'Paste some notes or type a topic, up to 20,000 characters.',
    canRetry: false,
  },
  config: {
    title: 'The server is not set up yet',
    hint: 'The AI key is missing on the server. Running it yourself? Add GEMINI_API_KEY to your .env file.',
    canRetry: false,
  },
  network: {
    title: 'Can’t reach the server',
    hint: 'Check your internet connection, then try again.',
    canRetry: true,
  },
  rate_limit: {
    title: 'Too many requests',
    hint: 'The free AI tier has a limit per minute. Wait a moment, then try again.',
    canRetry: true,
  },
  busy: {
    title: 'The AI is overloaded right now',
    hint: 'Google’s model is under heavy demand. We already retried once for you. Try again in a minute.',
    canRetry: true,
  },
  upstream: {
    title: 'The AI service had a problem',
    hint: 'Something went wrong on the AI provider’s side. Trying again usually works.',
    canRetry: true,
  },
  empty: {
    title: 'The AI sent back nothing',
    hint: 'It happens now and then. Try again, or rephrase your text if it keeps happening.',
    canRetry: true,
  },
  malformed: {
    title: 'The AI’s answer came back garbled',
    hint: 'It wasn’t valid JSON, so there was nothing we could safely read. Try again.',
    canRetry: true,
  },
  wrong_shape: {
    title: 'The AI’s answer didn’t fit',
    hint: 'It came back in the wrong format and none of it was usable. Try again.',
    canRetry: true,
  },
  server: {
    title: 'Something went wrong on our side',
    hint: 'The server sent something unexpected. Try again in a moment.',
    canRetry: true,
  },
  timeout: {
    title: 'That took too long',
    hint: 'No answer within 30 seconds. Try again, or use shorter notes.',
    canRetry: true,
  },
  cancelled: {
    title: 'Cancelled',
    hint: 'You stopped the request.',
    canRetry: true,
  },
}

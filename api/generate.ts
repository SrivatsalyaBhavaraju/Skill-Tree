export async function POST(request: Request): Promise<Response> {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: 'The server is missing its API key.' }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Request body must be JSON.' }, { status: 400 })
  }

  const text = typeof body === 'object' && body !== null && 'text' in body ? body.text : undefined

  return Response.json({
    title: 'Placeholder tree',
    receivedChars: typeof text === 'string' ? text.length : 0,
    nodes: [],
  })
}

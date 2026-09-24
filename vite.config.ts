import { existsSync } from 'node:fs'
import type { IncomingMessage } from 'node:http'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function apiDevServer(): Plugin {
  return {
    name: 'api-dev-server',
    configureServer(server) {
      server.middlewares.use('/api', async (req, res) => {
        const route = new URL(req.url ?? '/', 'http://localhost').pathname
        const file = path.join(server.config.root, 'api', `${route}.ts`)

        if (!/^\/[\w-]+$/.test(route) || !existsSync(file)) {
          res.statusCode = 404
          res.end()
          return
        }

        try {
          const handlers = await server.ssrLoadModule(file)
          const method = req.method ?? 'GET'
          const handler = handlers[method]

          if (typeof handler !== 'function') {
            res.statusCode = 405
            res.end()
            return
          }

          const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req)
          const abort = new AbortController()
          res.on('close', () => {
            if (!res.writableEnded) abort.abort()
          })
          const request = new Request(`http://localhost/api${route}`, {
            method,
            headers: { 'content-type': req.headers['content-type'] ?? '' },
            body,
            signal: abort.signal,
          })
          const response: Response = await handler(request)
          if (abort.signal.aborted) return

          res.statusCode = response.status
          response.headers.forEach((value, key) => res.setHeader(key, value))
          res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) {
          server.config.logger.error(String(error))
          res.statusCode = 500
          res.end()
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value
  }

  return {
    plugins: [react(), apiDevServer()],
  }
})

import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import whatsappRouter from './routes/whatsapp.js'
import { bootstrapWhatsAppRuntime } from './whatsapp/runtime.js'

const app = express()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distDir = path.resolve(__dirname, '..', 'dist')

app.use(cors({
  origin: env.clientOrigin,
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.use('/api/whatsapp', whatsappRouter)

if (env.nodeEnv === 'production') {
  app.use(express.static(distDir))
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error)
  }

  const status = error.status ?? 500
  const code = error.code ?? 'internal_error'

  logger.error({
    error: error?.message,
    code,
    path: req.path,
  }, 'API request failed.')

  return res.status(status).json({
    error: {
      code,
      message: status === 500 ? 'Internal server error.' : error.message,
    },
  })
})

app.listen(env.port, async () => {
  logger.info({ port: env.port }, 'DevControl API listening.')

  try {
    await bootstrapWhatsAppRuntime()
  } catch (error) {
    logger.error({ error: error?.message }, 'Failed to initialize WhatsApp runtime.')
  }
})

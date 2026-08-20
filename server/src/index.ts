import './config/env'
import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import path from 'path'

import { connectDB } from './config/db'
import { authRoutes } from './routes/authRoutes'
import { batchRoutes } from './routes/batchRoutes'
import { masterRoutes } from './routes/masterRoutes'
import { orderRoutes } from './routes/orderRoutes'

const app = express()
const PORT = Number(process.env.PORT) || 5000

// Frontend build location
// Backend: QMS/server
// Frontend: QMS/web/dist
const frontendPath = path.resolve(process.cwd(), '../web/dist')

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
)

app.use(express.json())

// =========================
// API HEALTH CHECK
// =========================

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    service: 'qms-api',
  })
})

// =========================
// API ROUTES
// =========================

app.use('/api/auth', authRoutes)
app.use('/api', masterRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/batches', batchRoutes)

// =========================
// SERVE FRONTEND
// =========================

app.use(express.static(frontendPath))

// React Router fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next()
  }

  res.sendFile(path.join(frontendPath, 'index.html'))
})

// =========================
// ERROR HANDLER
// =========================

app.use(
  (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error(err)

    res.status(err.name === 'UnauthorizedError' ? 401 : 500).json({
      success: false,
      message: err.message || 'Internal server error.',
    })
  },
)

// =========================
// START SERVER
// =========================

async function start() {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`QMS server running on port ${PORT}`)
  })
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'

  console.error('Failed to start server:', message)
  process.exit(1)
})
import 'dotenv/config'
import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express'
import { connectDB } from './config/db'
import { authRoutes } from './routes/authRoutes'
import { masterRoutes } from './routes/masterRoutes'
import { orderRoutes } from './routes/orderRoutes'

const app = express()
const PORT = Number(process.env.PORT) || 5000

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'qms-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api', masterRoutes)
app.use('/api/orders', orderRoutes)

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' })
})

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(err.name === 'UnauthorizedError' ? 401 : 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  })
})

async function start() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set')
  }

  await connectDB()

  app.listen(PORT, () => {
    console.log(`QMS API running on http://localhost:${PORT}`)
  })
}

start().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  console.error('Failed to start server:', message)
  process.exit(1)
})

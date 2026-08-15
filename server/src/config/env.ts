import path from 'node:path'
import { config as loadEnv } from 'dotenv'

const serverRoot = path.resolve(__dirname, '..')

loadEnv({ path: path.join(serverRoot, '.env') })

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'qms-local-dev-secret'
  console.warn(
    'JWT_SECRET is not set. Using a local development secret. Copy server/.env.example to server/.env for a custom value.',
  )
}

if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/qms'
}

if (!process.env.JWT_EXPIRES_IN) {
  process.env.JWT_EXPIRES_IN = '7d'
}

if (!process.env.CLIENT_ORIGIN) {
  process.env.CLIENT_ORIGIN = 'http://localhost:5173'
}

if (!process.env.PORT) {
  process.env.PORT = '5000'
}

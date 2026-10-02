import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'

/** Files live in QMS/server/uploads and are served at /api/uploads/... */
export const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads')
export const PROCESS_STEP_UPLOAD_DIR = path.join(UPLOAD_ROOT, 'process-steps')
export const PROCESS_STEP_URL_PREFIX = '/api/uploads/process-steps/'

fs.mkdirSync(PROCESS_STEP_UPLOAD_DIR, { recursive: true })

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_FILES_PER_REQUEST = 10

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
  '.csv',
  '.dwg',
  '.dxf',
])

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PROCESS_STEP_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES_PER_REQUEST },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error(`File type "${ext || 'unknown'}" is not allowed.`))
      return
    }
    cb(null, true)
  },
})

/** multipart field name: "files" (one or many). Upload errors become a 400 JSON response. */
export function uploadProcessStepFiles(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  upload.array('files', MAX_FILES_PER_REQUEST)(req, res, (error: unknown) => {
    if (!error) {
      next()
      return
    }
    let message = error instanceof Error ? error.message : 'Upload failed.'
    if (error instanceof multer.MulterError) {
      message =
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Each file must be 10 MB or smaller.'
          : error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE'
            ? `You can upload up to ${MAX_FILES_PER_REQUEST} files at a time.`
            : error.message
    }
    res.status(400).json({ success: false, message })
  })
}

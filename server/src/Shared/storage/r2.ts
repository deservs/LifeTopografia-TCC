import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../../config/env.js'

type MimeTypes =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'application/pdf'
  | 'application/dxf'

type UrlFileGeneratorResult =
  | {
      ok: true
      uploadUrl: string
      key: string
    }
  | {
      ok: false
      error: string
    }

const s3Client = new S3Client({
  region: env.AWS_REGION || 'auto',
  endpoint: env.AWS_S3_ENDPOINT,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
})

const MIME_TO_EXT: Record<MimeTypes, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/dxf': 'dxf',
}

const LimitImageSize = 5 * 1024 * 1024

const LimitPdfSize = 20 * 1024 * 1024

export async function UrlFileGenerator(
  userId: string,
  mimeType: MimeTypes,
  fileSize: number,
): Promise<UrlFileGeneratorResult> {
  let prefixType: string | null = null
  const fileExtension = MIME_TO_EXT[mimeType]
  if (!fileExtension) {
    return { ok: false, error: 'Unsupported file type.' }
  }
  if (
    fileExtension === 'jpg' ||
    fileExtension === 'png' ||
    fileExtension === 'webp' ||
    fileExtension === 'dxf'
  ) {
    if (!Number.isFinite(fileSize)) {
      return { ok: false, error: 'Invalid file size.' }
    }
    if (fileSize > LimitImageSize) {
      return { ok: false, error: 'File size exceeds the limit of 5MB.' }
    }
    if (fileSize <= 0) {
      return { ok: false, error: 'File size must be greater than 0.' }
    }
    prefixType = fileExtension === 'dxf' ? 'dxf' : 'image'
  }
  if (fileExtension === 'pdf') {
    if (!Number.isFinite(fileSize)) {
      return { ok: false, error: 'Invalid file size.' }
    }
    if (fileSize > LimitPdfSize) {
      return { ok: false, error: 'File size exceeds the limit of 20MB.' }
    }
    if (fileSize <= 0) {
      return { ok: false, error: 'File size must be greater than 0.' }
    }
    prefixType = 'pdf'
  }
  const key = `users/${userId}/${prefixType}-${Date.now()}.${fileExtension}`
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
    ContentLength: fileSize,
  })
  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 60,
    signableHeaders: new Set(['Content-Type', 'Content-Length']),
  })
  return { ok: true, uploadUrl, key }
}

export async function DeleteFileFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET_NAME,
    Key: key,
  })

  await s3Client.send(command)
}

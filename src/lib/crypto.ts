import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY
  if (!secret) {
    throw new Error('ENCRYPTION_KEY is not configured')
  }

  // Derive a 32-byte key from the secret using SHA-256
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptString(plainText: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const key = getEncryptionKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

export function decryptString(cipherText: string): string {
  const [ivPart, tagPart, dataPart] = cipherText.split(':')
  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Invalid encrypted payload')
  }

  const iv = Buffer.from(ivPart, 'base64')
  const authTag = Buffer.from(tagPart, 'base64')
  const encryptedText = Buffer.from(dataPart, 'base64')

  const key = getEncryptionKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()])
  return decrypted.toString('utf8')
}

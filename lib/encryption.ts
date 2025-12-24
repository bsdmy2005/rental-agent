import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 16 bytes for AES
const TAG_LENGTH = 16 // 16 bytes for GCM auth tag
const KEY_LENGTH = 32 // 32 bytes for AES-256

/**
 * Get encryption key from environment variable
 * Key must be 64-character hex string (32 bytes)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is not set")
  }
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64-character hex string (32 bytes)")
  }
  return Buffer.from(key, "hex")
}

/**
 * Encrypt a secret value
 * Returns: "aes256gcm:iv:tag:ciphertext" format
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty value")
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, "utf8", "hex")
  encrypted += cipher.final("hex")

  const tag = cipher.getAuthTag()

  // Format: algorithm:iv:tag:ciphertext
  return `aes256gcm:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`
}

/**
 * Decrypt a secret value
 * Input: "aes256gcm:iv:tag:ciphertext" format
 */
export function decryptSecret(ciphertext: string): string {
  if (!ciphertext) {
    throw new Error("Cannot decrypt empty value")
  }

  const parts = ciphertext.split(":")
  if (parts.length !== 4 || parts[0] !== "aes256gcm") {
    throw new Error("Invalid ciphertext format")
  }

  const [, ivHex, tagHex, encrypted] = parts

  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}


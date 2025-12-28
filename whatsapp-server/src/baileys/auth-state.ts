import {
  AuthenticationState,
  SignalDataTypeMap,
  initAuthCreds,
  proto,
  BufferJSON
} from "@whiskeysockets/baileys"
import { Pool } from "pg"
import type { AuthStateData } from "./types.js"
import { createLogger } from "../utils/logger.js"

const logger = createLogger("auth-state")

/**
 * Recursively converts Buffer objects in nested structures.
 * BufferJSON.reviver handles top-level Buffers but doesn't recursively
 * handle nested structures like pre-keys which have:
 * { public: {data: "...", type: "Buffer"}, private: {data: "...", type: "Buffer"} }
 */
function recursivelyDeserializeBuffers(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  // If it's already a Buffer, return it
  if (Buffer.isBuffer(obj)) {
    return obj
  }

  // Check if it's a Buffer-like object that needs conversion
  if (
    typeof obj === "object" &&
    obj.type === "Buffer" &&
    typeof obj.data === "string"
  ) {
    try {
      return Buffer.from(obj.data, "base64")
    } catch (error) {
      logger.warn(
        { error, objType: typeof obj, hasData: !!obj.data },
        "Failed to convert Buffer-like object to Buffer"
      )
      return obj
    }
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => recursivelyDeserializeBuffers(item))
  }

  // Handle objects - recursively process all properties
  if (typeof obj === "object") {
    const result: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = recursivelyDeserializeBuffers(obj[key])
      }
    }
    return result
  }

  // Primitive values - return as-is
  return obj
}

export class PostgresAuthState {
  private pool: Pool

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    })
  }

  async getAuthState(sessionId: string): Promise<{
    state: AuthenticationState
    saveCreds: () => Promise<void>
  }> {
    // Load existing auth state from database
    const result = await this.pool.query<{ auth_state: AuthStateData | null }>(
      "SELECT auth_state FROM whatsapp_sessions WHERE id = $1",
      [sessionId]
    )

    let creds = initAuthCreds()
    let keys: Record<string, any> = {}

    if (result.rows[0]?.auth_state) {
      const stored = result.rows[0].auth_state
      if (stored.creds) {
        // Parse the stored creds back using BufferJSON
        creds = JSON.parse(JSON.stringify(stored.creds), BufferJSON.reviver)
      }
      if (stored.keys) {
        // Keys need to be deserialized using BufferJSON.reviver like creds
        // stored.keys is already a parsed object from JSONB, so we need to re-stringify then parse with reviver
        keys = JSON.parse(JSON.stringify(stored.keys), BufferJSON.reviver)
        
        // Apply recursive deserialization to handle nested Buffer structures (e.g., pre-keys)
        keys = recursivelyDeserializeBuffers(keys) as Record<string, any>
        
        // Validate deserialization - check a sample pre-key if available
        const preKeyKeys = Object.keys(keys).filter((k) => k.startsWith("pre-key-"))
        if (preKeyKeys.length > 0) {
          const samplePreKey = keys[preKeyKeys[0]]
          if (samplePreKey && typeof samplePreKey === "object") {
            const publicKey = samplePreKey.public
            const privateKey = samplePreKey.private
            
            logger.debug(
              {
                sessionId,
                preKeyId: preKeyKeys[0],
                hasPublic: !!publicKey,
                hasPrivate: !!privateKey,
                publicIsBuffer: Buffer.isBuffer(publicKey),
                privateIsBuffer: Buffer.isBuffer(privateKey),
                publicKeyLength: Buffer.isBuffer(publicKey) ? publicKey.length : null,
                privateKeyLength: Buffer.isBuffer(privateKey) ? privateKey.length : null,
                totalKeys: Object.keys(keys).length,
                preKeyCount: preKeyKeys.length
              },
              "Keys loaded and deserialized - validating pre-key structure"
            )
            
            // Warn if keys aren't properly deserialized
            if (!Buffer.isBuffer(publicKey) || !Buffer.isBuffer(privateKey)) {
              logger.warn(
                {
                  sessionId,
                  preKeyId: preKeyKeys[0],
                  publicType: typeof publicKey,
                  privateType: typeof privateKey,
                  publicIsBuffer: Buffer.isBuffer(publicKey),
                  privateIsBuffer: Buffer.isBuffer(privateKey)
                },
                "Pre-key not properly deserialized - nested Buffers may be missing"
              )
            }
          }
        }
      }
    }

    const state: AuthenticationState = {
      creds,
      keys: {
        get: async <T extends keyof SignalDataTypeMap>(
          type: T,
          ids: string[]
        ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
          const data: { [id: string]: SignalDataTypeMap[T] } = {}
          for (const id of ids) {
            const key = `${type}-${id}`
            if (keys[key]) {
              let value = keys[key]
              
              // Ensure nested Buffer structures are properly deserialized
              // This handles cases where keys were stored before the recursive deserialization fix
              value = recursivelyDeserializeBuffers(value)
              
              // Validate pre-key structure if this is a pre-key
              if (type === "pre-key" && value && typeof value === "object") {
                const publicKey = value.public
                const privateKey = value.private
                
                if (publicKey && privateKey) {
                  const publicIsBuffer = Buffer.isBuffer(publicKey)
                  const privateIsBuffer = Buffer.isBuffer(privateKey)
                  
                  if (!publicIsBuffer || !privateIsBuffer) {
                    logger.warn(
                      {
                        sessionId,
                        type,
                        id,
                        publicIsBuffer,
                        privateIsBuffer,
                        publicType: typeof publicKey,
                        privateType: typeof privateKey,
                        publicHasType: !!(publicKey as any)?.type,
                        privateHasType: !!(privateKey as any)?.type
                      },
                      "Pre-key retrieved but nested Buffers not properly deserialized - attempting fix"
                    )
                    
                    // Attempt to fix by deserializing the nested structures
                    if (!publicIsBuffer && (publicKey as any)?.type === "Buffer") {
                      value.public = Buffer.from((publicKey as any).data, "base64")
                    }
                    if (!privateIsBuffer && (privateKey as any)?.type === "Buffer") {
                      value.private = Buffer.from((privateKey as any).data, "base64")
                    }
                    
                    // Validate Buffer lengths
                    const finalPublic = value.public
                    const finalPrivate = value.private
                    if (Buffer.isBuffer(finalPublic) && Buffer.isBuffer(finalPrivate)) {
                      if (finalPrivate.length !== 32) {
                        logger.error(
                          {
                            sessionId,
                            type,
                            id,
                            privateKeyLength: finalPrivate.length,
                            expectedLength: 32
                          },
                          "Pre-key private key has incorrect length - this may cause decryption failures"
                        )
                      }
                      if (finalPublic.length !== 33) {
                        logger.warn(
                          {
                            sessionId,
                            type,
                            id,
                            publicKeyLength: finalPublic.length,
                            expectedLength: 33
                          },
                          "Pre-key public key has unexpected length"
                        )
                      }
                    }
                  } else {
                    // Log successful deserialization for debugging
                    logger.debug(
                      {
                        sessionId,
                        type,
                        id,
                        publicKeyLength: Buffer.isBuffer(publicKey) ? publicKey.length : null,
                        privateKeyLength: Buffer.isBuffer(privateKey) ? privateKey.length : null
                      },
                      "Pre-key retrieved with properly deserialized Buffers"
                    )
                  }
                }
              }
              
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              data[id] = value
            } else {
              logger.debug(
                {
                  sessionId,
                  type,
                  id,
                  key,
                  availableKeysCount: Object.keys(keys).length,
                  preKeyCount: Object.keys(keys).filter((k: string) =>
                    k.startsWith("pre-key-")
                  ).length
                },
                "Key not found in keys store"
              )
            }
          }
          return data
        },
        set: async (data: any) => {
          for (const category in data) {
            for (const id in data[category]) {
              const key = `${category}-${id}`
              const value = data[category][id]
              if (value) {
                keys[key] = value
              } else {
                delete keys[key]
              }
            }
          }
          await this.saveToDb(sessionId, creds, keys)
        }
      }
    }

    const saveCreds = async () => {
      await this.saveToDb(sessionId, state.creds, keys)
    }

    return { state, saveCreds }
  }

  private async saveToDb(
    sessionId: string,
    creds: any,
    keys: Record<string, any>
  ): Promise<void> {
    const authStateJson = JSON.stringify(
      { creds, keys },
      BufferJSON.replacer
    )
    await this.pool.query(
      `UPDATE whatsapp_sessions
       SET auth_state = $1, updated_at = NOW()
       WHERE id = $2`,
      [authStateJson, sessionId]
    )
  }

  async clearAuthState(sessionId: string): Promise<void> {
    await this.pool.query(
      `UPDATE whatsapp_sessions
       SET auth_state = NULL, updated_at = NOW()
       WHERE id = $1`,
      [sessionId]
    )
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

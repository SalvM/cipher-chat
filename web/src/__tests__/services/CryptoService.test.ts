import { describe, it, expect, afterEach } from 'vitest'
import { CryptoService } from '@/services/CryptoService'

afterEach(() => CryptoService.clearSessionKey())

describe('CryptoService — session key cache', () => {
  it('caches and retrieves key bytes', () => {
    const original = new Uint8Array([10, 20, 30, 40])
    CryptoService.cacheSessionKey(original.buffer)
    const retrieved = CryptoService.getSessionKeyBytes()
    expect(new Uint8Array(retrieved!)).toEqual(original)
  })

  it('returns null when nothing cached', () => {
    expect(CryptoService.getSessionKeyBytes()).toBeNull()
  })

  it('clears cached key', () => {
    CryptoService.cacheSessionKey(new Uint8Array([1]).buffer)
    CryptoService.clearSessionKey()
    expect(CryptoService.getSessionKeyBytes()).toBeNull()
  })
})

describe('CryptoService — AES-GCM message encryption', () => {
  it('round-trips plaintext through encrypt/decrypt', async () => {
    const key = await CryptoService.generateConversationKey()
    const plaintext = 'Hello, cipher-chat!'
    const ciphertext = await CryptoService.encryptMessage(key, plaintext)
    const decrypted = await CryptoService.decryptMessage(key, ciphertext)
    expect(decrypted).toBe(plaintext)
  })

  it('produces different ciphertext each call (random IV)', async () => {
    const key = await CryptoService.generateConversationKey()
    const c1 = await CryptoService.encryptMessage(key, 'same')
    const c2 = await CryptoService.encryptMessage(key, 'same')
    expect(c1).not.toBe(c2)
  })

  it('decryptMessageSafe returns fallback for invalid ciphertext', async () => {
    const key = await CryptoService.generateConversationKey()
    const result = await CryptoService.decryptMessageSafe(key, 'aW52YWxpZA==')
    expect(result).toBe('[Encrypted message]')
  })

  it('decryptMessageSafe returns plaintext for valid ciphertext', async () => {
    const key = await CryptoService.generateConversationKey()
    const ciphertext = await CryptoService.encryptMessage(key, 'valid')
    const result = await CryptoService.decryptMessageSafe(key, ciphertext)
    expect(result).toBe('valid')
  })
})

describe('CryptoService — conversation key export/import', () => {
  it('exported raw key can be re-imported and used for decryption', async () => {
    const key = await CryptoService.generateConversationKey()
    const raw = await CryptoService.exportRawKey(key)
    const imported = await CryptoService.importConversationKey(raw)

    const ciphertext = await CryptoService.encryptMessage(key, 'round-trip')
    const decrypted = await CryptoService.decryptMessage(imported, ciphertext)
    expect(decrypted).toBe('round-trip')
  })
})

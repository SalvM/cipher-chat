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

describe('CryptoService — RSA identity keypair', () => {
  it('generates a keypair with public and private CryptoKey', async () => {
    const { publicKey, privateKey } = await CryptoService.generateIdentityKeypair()
    expect(publicKey).toBeInstanceOf(CryptoKey)
    expect(privateKey).toBeInstanceOf(CryptoKey)
  }, 10000)

  it('round-trips public key through export/import', async () => {
    const { publicKey } = await CryptoService.generateIdentityKeypair()
    const b64 = await CryptoService.exportPublicKey(publicKey)
    expect(typeof b64).toBe('string')
    expect(b64.length).toBeGreaterThan(0)
    const imported = await CryptoService.importPublicKey(b64)
    expect(imported).toBeInstanceOf(CryptoKey)
  }, 10000)

  it('round-trips data through rsaEncrypt/rsaDecrypt', async () => {
    const { publicKey, privateKey } = await CryptoService.generateIdentityKeypair()
    const data = new TextEncoder().encode('secret-aes-key')
    const encrypted = await CryptoService.rsaEncrypt(publicKey, data.buffer)
    expect(typeof encrypted).toBe('string')
    const decrypted = await CryptoService.rsaDecrypt(privateKey, encrypted)
    expect(new Uint8Array(decrypted)).toEqual(data)
  }, 10000)

  it('rsaDecrypt throws on wrong key', async () => {
    const { publicKey } = await CryptoService.generateIdentityKeypair()
    const { privateKey: wrongKey } = await CryptoService.generateIdentityKeypair()
    const data = new TextEncoder().encode('data').buffer
    const encrypted = await CryptoService.rsaEncrypt(publicKey, data)
    await expect(CryptoService.rsaDecrypt(wrongKey, encrypted)).rejects.toThrow()
  }, 15000)
})

describe('CryptoService — private key encryption (PBKDF2 + AES-GCM)', () => {
  it('round-trips private key through encryptPrivateKey/decryptPrivateKey', async () => {
    const { publicKey, privateKey } = await CryptoService.generateIdentityKeypair()
    const bundle = await CryptoService.encryptPrivateKey(privateKey, 'pw123')
    expect(typeof bundle).toBe('string')

    const restored = await CryptoService.decryptPrivateKey(bundle, 'pw123')
    expect(restored).toBeInstanceOf(CryptoKey)

    // Verify the restored key works: encrypt with original public key, decrypt with restored private
    const plaintext = new TextEncoder().encode('verify').buffer
    const enc = await CryptoService.rsaEncrypt(publicKey, plaintext)
    const dec = await CryptoService.rsaDecrypt(restored, enc)
    expect(new Uint8Array(dec)).toEqual(new Uint8Array(plaintext))
  }, 20000)

  it('decryptPrivateKey throws on wrong password', async () => {
    const { privateKey } = await CryptoService.generateIdentityKeypair()
    const bundle = await CryptoService.encryptPrivateKey(privateKey, 'correct')
    await expect(CryptoService.decryptPrivateKey(bundle, 'wrong')).rejects.toThrow()
  }, 20000)

  it('encryptPrivateKey caches PKCS8 in session storage', async () => {
    const { privateKey } = await CryptoService.generateIdentityKeypair()
    await CryptoService.encryptPrivateKey(privateKey, 'pass')
    expect(CryptoService.getSessionKeyBytes()).not.toBeNull()
  }, 15000)
})

describe('CryptoService — importPrivateKeyFromSession', () => {
  it('returns null when nothing in session', async () => {
    CryptoService.clearSessionKey()
    expect(await CryptoService.importPrivateKeyFromSession()).toBeNull()
  })

  it('imports a valid PKCS8 key from session cache', async () => {
    const { privateKey } = await CryptoService.generateIdentityKeypair()
    const pkcs8 = await crypto.subtle.exportKey('pkcs8', privateKey)
    CryptoService.cacheSessionKey(pkcs8)
    const imported = await CryptoService.importPrivateKeyFromSession()
    expect(imported).toBeInstanceOf(CryptoKey)
  }, 10000)

  it('returns null for corrupted session bytes', async () => {
    CryptoService.cacheSessionKey(new Uint8Array([0, 1, 2, 3]).buffer)
    expect(await CryptoService.importPrivateKeyFromSession()).toBeNull()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockApiGet, mockApiPost } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
}))

const {
  mockRsaDecrypt,
  mockImportConversationKey,
  mockGenerateConversationKey,
  mockExportRawKey,
  mockImportPublicKey,
  mockRsaEncrypt,
} = vi.hoisted(() => ({
  mockRsaDecrypt: vi.fn(),
  mockImportConversationKey: vi.fn(),
  mockGenerateConversationKey: vi.fn(),
  mockExportRawKey: vi.fn(),
  mockImportPublicKey: vi.fn(),
  mockRsaEncrypt: vi.fn(),
}))

const { mockPrivateKey } = vi.hoisted(() => ({
  mockPrivateKey: { type: 'private' } as unknown as CryptoKey,
}))

const { mockSocketEmit } = vi.hoisted(() => ({ mockSocketEmit: vi.fn() }))

// ── vi.mock calls ─────────────────────────────────────────────────────────────

vi.mock('@/services/Api', () => ({
  default: { get: mockApiGet, post: mockApiPost },
}))

vi.mock('@/services/CryptoService', () => ({
  CryptoService: {
    rsaDecrypt: mockRsaDecrypt,
    importConversationKey: mockImportConversationKey,
    generateConversationKey: mockGenerateConversationKey,
    exportRawKey: mockExportRawKey,
    importPublicKey: mockImportPublicKey,
    rsaEncrypt: mockRsaEncrypt,
  },
}))

vi.mock('@/stores/cryptoStore', () => ({
  useCryptoStore: { getState: () => ({ privateKey: mockPrivateKey }) },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ user: { _id: 'self-1' } }) },
}))

vi.mock('@/services/SocketService', () => ({
  socketService: { emit: mockSocketEmit },
}))

// ── Import after mocks ─────────────────────────────────────────────────────────

import { keyService } from '@/services/KeyService'

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockCK = { type: 'secret' } as unknown as CryptoKey
const mockCKEntry = { key: mockCK, version: 1 }
const mockRaw = new ArrayBuffer(32)
const mockEncryptedKey = 'base64encryptedkey=='
const mockPubKey = { type: 'public' } as unknown as CryptoKey

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  keyService.clearAll()
})

describe('KeyService — cache', () => {
  it('returns cached entry on cache hit', async () => {
    mockApiGet.mockResolvedValueOnce({ encrypted_key: mockEncryptedKey, key_version: 1 })
    mockRsaDecrypt.mockResolvedValueOnce(mockRaw)
    mockImportConversationKey.mockResolvedValueOnce(mockCK)

    const first = await keyService.getConversationKey('chat', 'chat-1')
    const second = await keyService.getConversationKey('chat', 'chat-1')

    expect(mockApiGet).toHaveBeenCalledTimes(1)
    expect(first).toBe(second)
  })

  it('evict removes entry; next call hits API', async () => {
    mockApiGet.mockResolvedValue({ encrypted_key: mockEncryptedKey, key_version: 1 })
    mockRsaDecrypt.mockResolvedValue(mockRaw)
    mockImportConversationKey.mockResolvedValue(mockCK)

    await keyService.getConversationKey('chat', 'chat-1')
    keyService.evict('chat', 'chat-1')
    await keyService.getConversationKey('chat', 'chat-1')

    expect(mockApiGet).toHaveBeenCalledTimes(2)
  })

  it('clearAll empties all contexts', async () => {
    mockApiGet.mockResolvedValue({ encrypted_key: mockEncryptedKey, key_version: 2 })
    mockRsaDecrypt.mockResolvedValue(mockRaw)
    mockImportConversationKey.mockResolvedValue(mockCK)

    await keyService.getConversationKey('chat', 'c1')
    await keyService.getConversationKey('cluster', 'cl1')
    keyService.clearAll()
    await keyService.getConversationKey('chat', 'c1')
    await keyService.getConversationKey('cluster', 'cl1')

    expect(mockApiGet).toHaveBeenCalledTimes(4)
  })

  it('getCachedKey returns undefined before fetch', () => {
    expect(keyService.getCachedKey('chat', 'chat-1')).toBeUndefined()
  })

  it('getCachedKey returns entry after fetch', async () => {
    mockApiGet.mockResolvedValueOnce({ encrypted_key: mockEncryptedKey, key_version: 3 })
    mockRsaDecrypt.mockResolvedValueOnce(mockRaw)
    mockImportConversationKey.mockResolvedValueOnce(mockCK)

    await keyService.getConversationKey('chat', 'chat-x')
    expect(keyService.getCachedKey('chat', 'chat-x')).toEqual({ key: mockCK, version: 3 })
  })
})

describe('KeyService — getConversationKey (API flows)', () => {
  it('decrypts and caches key from API response', async () => {
    mockApiGet.mockResolvedValueOnce({ encrypted_key: mockEncryptedKey, key_version: 2 })
    mockRsaDecrypt.mockResolvedValueOnce(mockRaw)
    mockImportConversationKey.mockResolvedValueOnce(mockCK)

    const result = await keyService.getConversationKey('chat', 'chat-1')

    expect(mockRsaDecrypt).toHaveBeenCalledWith(mockPrivateKey, mockEncryptedKey)
    expect(mockImportConversationKey).toHaveBeenCalledWith(mockRaw)
    expect(result).toEqual({ key: mockCK, version: 2 })
  })

  it('KEY_PENDING: emits socket event and returns null', async () => {
    const err = Object.assign(new Error('not found'), {
      status: 404,
      data: { code: 'KEY_PENDING' },
    })
    mockApiGet.mockRejectedValueOnce(err)

    const result = await keyService.getConversationKey('chat', 'chat-pending')

    expect(mockSocketEmit).toHaveBeenCalledWith('key_deposit_requested', {
      context_type: 'chat',
      context_id: 'chat-pending',
      user_id: 'self-1',
    })
    expect(result).toBeNull()
  })

  it('NO_KEY without memberIds throws', async () => {
    const err = Object.assign(new Error('not found'), {
      status: 404,
      data: { code: 'NO_KEY' },
    })
    mockApiGet.mockRejectedValueOnce(err)

    await expect(
      keyService.getConversationKey('chat', 'chat-no-key')
    ).rejects.toMatchObject({ status: 404 })
  })

  it('NO_KEY with memberIds generates and deposits key', async () => {
    const err = Object.assign(new Error('not found'), {
      status: 404,
      data: { code: 'NO_KEY' },
    })
    mockApiGet.mockRejectedValueOnce(err)
    // _generateAndDeposit calls api.get for each member's public key
    mockApiGet.mockResolvedValueOnce({ public_key: 'pub-u1-b64' })
    mockApiGet.mockResolvedValueOnce({ public_key: 'pub-u2-b64' })

    mockGenerateConversationKey.mockResolvedValueOnce(mockCK)
    mockExportRawKey.mockResolvedValueOnce(mockRaw)
    mockImportPublicKey.mockResolvedValue(mockPubKey)
    mockRsaEncrypt.mockResolvedValue(mockEncryptedKey)
    mockApiPost.mockResolvedValueOnce(null)

    const result = await keyService.getConversationKey('chat', 'chat-new', ['u1', 'u2'])

    expect(mockGenerateConversationKey).toHaveBeenCalledTimes(1)
    expect(mockApiPost).toHaveBeenCalledWith('/keys/conversation', {
      body: expect.objectContaining({
        context_type: 'chat',
        context_id: 'chat-new',
        keys: expect.arrayContaining([
          expect.objectContaining({ user_id: 'u1' }),
          expect.objectContaining({ user_id: 'u2' }),
        ]),
      }),
    })
    expect(result).toEqual({ key: mockCK, version: 1 })
  })

  it('propagates non-404 errors', async () => {
    const err = Object.assign(new Error('server error'), { status: 500 })
    mockApiGet.mockRejectedValueOnce(err)

    await expect(
      keyService.getConversationKey('chat', 'chat-err')
    ).rejects.toMatchObject({ status: 500 })
  })
})

describe('KeyService — depositKeyForUser', () => {
  it('encrypts and deposits key for new user', async () => {
    // Prime cache
    mockApiGet.mockResolvedValueOnce({ encrypted_key: mockEncryptedKey, key_version: 1 })
    mockRsaDecrypt.mockResolvedValueOnce(mockRaw)
    mockImportConversationKey.mockResolvedValueOnce(mockCK)
    await keyService.getConversationKey('chat', 'chat-d')

    mockExportRawKey.mockResolvedValueOnce(mockRaw)
    mockApiGet.mockResolvedValueOnce({ public_key: 'pub-new-user' })
    mockImportPublicKey.mockResolvedValueOnce(mockPubKey)
    mockRsaEncrypt.mockResolvedValueOnce(mockEncryptedKey)
    mockApiPost.mockResolvedValueOnce(null)

    await keyService.depositKeyForUser('chat', 'chat-d', 'new-user-id')

    expect(mockApiPost).toHaveBeenCalledWith('/keys/conversation', {
      body: expect.objectContaining({
        keys: [
          expect.objectContaining({
            user_id: 'new-user-id',
            encrypted_key: mockEncryptedKey,
            key_version: 1,
          }),
        ],
      }),
    })
  })

  it('silently returns when key unavailable', async () => {
    mockApiGet.mockRejectedValueOnce(Object.assign(new Error('fail'), { status: 500 }))
    await expect(
      keyService.depositKeyForUser('chat', 'chat-fail', 'user-x')
    ).resolves.toBeUndefined()
  })
})

describe('KeyService — rotateClusterKey', () => {
  it('generates new key, deposits for remaining members, bumps version', async () => {
    // Prime cache at version 2
    mockApiGet.mockResolvedValueOnce({ encrypted_key: mockEncryptedKey, key_version: 2 })
    mockRsaDecrypt.mockResolvedValueOnce(mockRaw)
    mockImportConversationKey.mockResolvedValueOnce(mockCK)
    await keyService.getConversationKey('cluster', 'cl-1')

    const newCK = { type: 'secret', label: 'new' } as unknown as CryptoKey
    mockGenerateConversationKey.mockResolvedValueOnce(newCK)
    mockExportRawKey.mockResolvedValueOnce(mockRaw)
    mockApiGet.mockResolvedValueOnce({ public_key: 'pub-m1' })
    mockImportPublicKey.mockResolvedValueOnce(mockPubKey)
    mockRsaEncrypt.mockResolvedValueOnce(mockEncryptedKey)
    mockApiPost.mockResolvedValueOnce(null)

    await keyService.rotateClusterKey('cl-1', ['m1'])

    expect(mockApiPost).toHaveBeenCalledWith('/keys/rotate', {
      body: { cluster_id: 'cl-1', new_key_version: 3, keys: [expect.objectContaining({ user_id: 'm1' })] },
    })
    expect(keyService.getCachedKey('cluster', 'cl-1')).toEqual({ key: newCK, version: 3 })
  })

  it('uses version 2 when no prior cache (base version is 1)', async () => {
    const newCK = { type: 'secret' } as unknown as CryptoKey
    mockGenerateConversationKey.mockResolvedValueOnce(newCK)
    mockExportRawKey.mockResolvedValueOnce(mockRaw)
    mockApiGet.mockResolvedValueOnce({ public_key: 'pub-m1' })
    mockImportPublicKey.mockResolvedValueOnce(mockPubKey)
    mockRsaEncrypt.mockResolvedValueOnce(mockEncryptedKey)
    mockApiPost.mockResolvedValueOnce(null)

    await keyService.rotateClusterKey('cl-fresh', ['m1'])

    expect(mockApiPost).toHaveBeenCalledWith(
      '/keys/rotate',
      expect.objectContaining({ body: expect.objectContaining({ new_key_version: 2 }) })
    )
  })
})

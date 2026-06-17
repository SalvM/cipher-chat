import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockDecryptPrivateKey = vi.fn()

vi.mock('@/services/CryptoService', () => ({
  CryptoService: {
    decryptPrivateKey: mockDecryptPrivateKey,
  },
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('cryptoStore', () => {
  let ls: Record<string, string | null>

  beforeEach(() => {
    vi.clearAllMocks()
    ls = {}
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => ls[k] ?? null,
      setItem: (k: string, v: string) => { ls[k] = v },
      removeItem: (k: string) => { delete ls[k] },
    })
  })

  describe('setPrivateKey', () => {
    it('sets key and marks isUnlocked true', async () => {
      const { useCryptoStore } = await import('@/stores/cryptoStore')
      const fakeKey = {} as CryptoKey
      useCryptoStore.setState({ privateKey: null, isUnlocked: false })

      useCryptoStore.getState().setPrivateKey(fakeKey)

      const state = useCryptoStore.getState()
      expect(state.privateKey).toBe(fakeKey)
      expect(state.isUnlocked).toBe(true)
    })
  })

  describe('clearPrivateKey', () => {
    it('clears key and marks isUnlocked false', async () => {
      const { useCryptoStore } = await import('@/stores/cryptoStore')
      useCryptoStore.setState({ privateKey: {} as CryptoKey, isUnlocked: true })

      useCryptoStore.getState().clearPrivateKey()

      const state = useCryptoStore.getState()
      expect(state.privateKey).toBeNull()
      expect(state.isUnlocked).toBe(false)
    })
  })

  describe('unlockWithPassword', () => {
    it('returns false when no bundle in localStorage', async () => {
      const { useCryptoStore } = await import('@/stores/cryptoStore')
      useCryptoStore.setState({ privateKey: null, isUnlocked: false })

      const result = await useCryptoStore.getState().unlockWithPassword('anypassword')

      expect(result).toBe(false)
      expect(useCryptoStore.getState().isUnlocked).toBe(false)
      expect(mockDecryptPrivateKey).not.toHaveBeenCalled()
    })

    it('returns true and sets key when decryption succeeds', async () => {
      const fakeKey = {} as CryptoKey
      mockDecryptPrivateKey.mockResolvedValueOnce(fakeKey)
      ls['privateKeyBundle'] = 'encrypted-bundle'

      const { useCryptoStore } = await import('@/stores/cryptoStore')
      useCryptoStore.setState({ privateKey: null, isUnlocked: false })

      const result = await useCryptoStore.getState().unlockWithPassword('correct-pass')

      expect(result).toBe(true)
      expect(mockDecryptPrivateKey).toHaveBeenCalledWith('encrypted-bundle', 'correct-pass')
      const state = useCryptoStore.getState()
      expect(state.isUnlocked).toBe(true)
      expect(state.privateKey).toBe(fakeKey)
    })

    it('returns false and does not set key when decryption throws', async () => {
      mockDecryptPrivateKey.mockRejectedValueOnce(new Error('wrong password'))
      ls['privateKeyBundle'] = 'encrypted-bundle'

      const { useCryptoStore } = await import('@/stores/cryptoStore')
      useCryptoStore.setState({ privateKey: null, isUnlocked: false })

      const result = await useCryptoStore.getState().unlockWithPassword('wrong-pass')

      expect(result).toBe(false)
      const state = useCryptoStore.getState()
      expect(state.isUnlocked).toBe(false)
      expect(state.privateKey).toBeNull()
    })

    it('calls decryptPrivateKey with the stored bundle and given password', async () => {
      const fakeKey = {} as CryptoKey
      mockDecryptPrivateKey.mockResolvedValueOnce(fakeKey)
      ls['privateKeyBundle'] = 'my-specific-bundle'

      const { useCryptoStore } = await import('@/stores/cryptoStore')

      await useCryptoStore.getState().unlockWithPassword('my-password')

      expect(mockDecryptPrivateKey).toHaveBeenCalledWith('my-specific-bundle', 'my-password')
    })
  })
})

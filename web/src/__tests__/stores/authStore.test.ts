// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPost = vi.fn()
const mockGet = vi.fn()
const mockPut = vi.fn()

vi.mock('@/services/Api', () => ({
  default: { post: mockPost, get: mockGet, put: mockPut },
}))

const mockGenerateIdentityKeypair = vi.fn()
const mockExportPublicKey = vi.fn()
const mockEncryptPrivateKey = vi.fn()
const mockDecryptPrivateKey = vi.fn()
const mockImportPrivateKeyFromSession = vi.fn()
const mockClearSessionKey = vi.fn()

vi.mock('@/services/CryptoService', () => ({
  CryptoService: {
    generateIdentityKeypair: mockGenerateIdentityKeypair,
    exportPublicKey: mockExportPublicKey,
    encryptPrivateKey: mockEncryptPrivateKey,
    decryptPrivateKey: mockDecryptPrivateKey,
    importPrivateKeyFromSession: mockImportPrivateKeyFromSession,
    clearSessionKey: mockClearSessionKey,
  },
}))

const mockSetPrivateKey = vi.fn()
const mockClearPrivateKey = vi.fn()

vi.mock('@/stores/cryptoStore', () => ({
  useCryptoStore: {
    getState: () => ({
      setPrivateKey: mockSetPrivateKey,
      clearPrivateKey: mockClearPrivateKey,
      isUnlocked: false,
    }),
  },
}))

vi.mock('@/services/KeyService', () => ({
  keyService: { clearAll: vi.fn() },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockLocalStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('authStore', () => {
  let ls: ReturnType<typeof mockLocalStorage>

  beforeEach(() => {
    vi.clearAllMocks()
    ls = mockLocalStorage()
    vi.stubGlobal('localStorage', ls)
  })

  describe('initialize', () => {
    it('sets isAuthenticated true when token exists', async () => {
      ls.setItem('token', 'tok123')
      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.setState({ token: null, isAuthenticated: false, isInitializing: true })
      useAuthStore.getState().initialize()
      const state = useAuthStore.getState()
      expect(state.token).toBe('tok123')
      expect(state.isAuthenticated).toBe(true)
    })

    it('sets isAuthenticated false when no token', async () => {
      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.setState({ token: null, isAuthenticated: true, isInitializing: true })
      useAuthStore.getState().initialize()
      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('login', () => {
    it('success: sets token, user, isAuthenticated', async () => {
      const fakeUser = {
        _id: 'u1', username: 'alice', username_lower: 'alice',
        display_name: 'Alice', status: 'online', created_at: '2024-01-01T00:00:00Z',
      }
      mockPost.mockResolvedValueOnce({ token: 'tok-abc', user: fakeUser })
      mockGenerateIdentityKeypair.mockResolvedValue({ publicKey: {}, privateKey: {} })
      mockExportPublicKey.mockResolvedValue('pubkey-b64')
      mockPut.mockResolvedValue(true)
      mockEncryptPrivateKey.mockResolvedValue('bundle-enc')

      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.setState({ token: null, user: null, isAuthenticated: false })

      const result = await useAuthStore.getState().login('alice', 'pass')

      expect(result.success).toBe(true)
      const state = useAuthStore.getState()
      expect(state.token).toBe('tok-abc')
      expect(state.isAuthenticated).toBe(true)
      expect(state.user?.username).toBe('alice')
      expect(ls.getItem('token')).toBe('tok-abc')
    })

    it('failure: returns success:false with error message', async () => {
      mockPost.mockRejectedValueOnce({ data: { detail: 'Invalid credentials' } })

      const { useAuthStore } = await import('@/stores/authStore')
      const result = await useAuthStore.getState().login('alice', 'wrong')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid credentials')
    })

    it('failure: falls back to generic message when no detail', async () => {
      mockPost.mockRejectedValueOnce({})

      const { useAuthStore } = await import('@/stores/authStore')
      const result = await useAuthStore.getState().login('alice', 'wrong')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Login failed')
    })

    it('decrypts existing privateKeyBundle on login', async () => {
      const fakeUser = {
        _id: 'u1', username: 'alice', username_lower: 'alice',
        display_name: 'Alice', status: 'online', created_at: '2024-01-01T00:00:00Z',
      }
      ls.setItem('privateKeyBundle', 'existing-bundle')
      mockPost.mockResolvedValueOnce({ token: 'tok-abc', user: fakeUser })
      const fakePk = {} as CryptoKey
      mockDecryptPrivateKey.mockResolvedValue(fakePk)

      const { useAuthStore } = await import('@/stores/authStore')
      await useAuthStore.getState().login('alice', 'pass')

      expect(mockDecryptPrivateKey).toHaveBeenCalledWith('existing-bundle', 'pass')
      expect(mockSetPrivateKey).toHaveBeenCalledWith(fakePk)
    })
  })

  describe('register', () => {
    it('success: sets token, user, isAuthenticated', async () => {
      const fakeUser = {
        _id: 'u2', username: 'bob', username_lower: 'bob',
        display_name: 'Bob', status: 'online', created_at: '2024-01-01T00:00:00Z',
      }
      mockPost.mockResolvedValueOnce({ token: 'tok-new', user: fakeUser })
      mockGenerateIdentityKeypair.mockResolvedValue({ publicKey: {}, privateKey: {} })
      mockExportPublicKey.mockResolvedValue('pubkey-b64')
      mockPut.mockResolvedValue(true)
      mockEncryptPrivateKey.mockResolvedValue('bundle-new')

      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.setState({ token: null, user: null, isAuthenticated: false })

      const result = await useAuthStore.getState().register('bob', 'pass', 'Bob')

      expect(result.success).toBe(true)
      const state = useAuthStore.getState()
      expect(state.token).toBe('tok-new')
      expect(state.isAuthenticated).toBe(true)
      expect(state.user?.username).toBe('bob')
      expect(ls.getItem('token')).toBe('tok-new')
    })

    it('failure: returns success:false with error message', async () => {
      mockPost.mockRejectedValueOnce({ data: { detail: 'Username taken' } })

      const { useAuthStore } = await import('@/stores/authStore')
      const result = await useAuthStore.getState().register('bob', 'pass', 'Bob')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Username taken')
    })

    it('generates keypair and saves bundle on success', async () => {
      const fakeUser = {
        _id: 'u2', username: 'bob', username_lower: 'bob',
        display_name: 'Bob', status: 'online', created_at: '2024-01-01T00:00:00Z',
      }
      mockPost.mockResolvedValueOnce({ token: 'tok-new', user: fakeUser })
      mockGenerateIdentityKeypair.mockResolvedValue({ publicKey: {}, privateKey: {} })
      mockExportPublicKey.mockResolvedValue('pubkey-b64')
      mockPut.mockResolvedValue(true)
      mockEncryptPrivateKey.mockResolvedValue('bundle-new')

      const { useAuthStore } = await import('@/stores/authStore')
      await useAuthStore.getState().register('bob', 'pass', 'Bob')

      expect(mockGenerateIdentityKeypair).toHaveBeenCalled()
      expect(mockEncryptPrivateKey).toHaveBeenCalled()
      expect(ls.getItem('privateKeyBundle')).toBe('bundle-new')
    })
  })

  describe('logout', () => {
    it('clears token, user, isAuthenticated from state and localStorage', async () => {
      ls.setItem('token', 'tok-abc')
      ls.setItem('user', '{"username":"alice"}')

      const { useAuthStore } = await import('@/stores/authStore')
      useAuthStore.setState({
        token: 'tok-abc',
        user: { _id: 'u1', username: 'alice', username_lower: 'alice', display_name: 'Alice', status: 'online' },
        isAuthenticated: true,
      })

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.token).toBeNull()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
      expect(ls.getItem('token')).toBeNull()
      expect(mockClearPrivateKey).toHaveBeenCalled()
      expect(mockClearSessionKey).toHaveBeenCalled()
    })
  })
})

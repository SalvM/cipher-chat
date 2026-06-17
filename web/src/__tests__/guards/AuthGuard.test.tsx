// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockAuthState = { isAuthenticated: false, isInitializing: false }
let mockCryptoState = { isUnlocked: false }

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector?: any) => selector ? selector(mockAuthState) : mockAuthState,
}))

vi.mock('@/stores/cryptoStore', () => ({
  useCryptoStore: (selector?: any) => selector ? selector(mockCryptoState) : mockCryptoState,
}))

vi.mock('react-router', () => ({
  Navigate: ({ to }: { to: string }) => React.createElement('div', { 'data-navigate': to }),
  Outlet: () => React.createElement('div', { 'data-outlet': 'true' }),
}))

vi.mock('@/components/Auth/UnlockKeyPrompt', () => ({
  UnlockKeyPrompt: () => React.createElement('div', { 'data-unlock': 'true' }),
}))

vi.mock('@/components/Common/LoadingPage', () => ({
  LoadingPage: () => React.createElement('div', { 'data-loading': 'true' }),
}))

// localStorage stub
const ls: Record<string, string | null> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => ls[k] ?? null,
  setItem: (k: string, v: string) => { ls[k] = v },
  removeItem: (k: string) => { delete ls[k] },
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete ls['privateKeyBundle']
    mockAuthState = { isAuthenticated: false, isInitializing: false }
    mockCryptoState = { isUnlocked: false }
  })

  it('Gate 1: redirects to /login when not authenticated', async () => {
    const { AuthGuard } = await import('@/Pages/guards/AuthGuard')
    mockAuthState = { isAuthenticated: false, isInitializing: false }

    const html = renderToStaticMarkup(React.createElement(AuthGuard))
    expect(html).toContain('data-navigate="/login"')
  })

  it('Gate 2: shows LoadingPage while initializing', async () => {
    const { AuthGuard } = await import('@/Pages/guards/AuthGuard')
    mockAuthState = { isAuthenticated: true, isInitializing: true }

    const html = renderToStaticMarkup(React.createElement(AuthGuard))
    expect(html).toContain('data-loading')
  })

  it('Gate 3: shows UnlockKeyPrompt when authenticated but key locked and bundle exists', async () => {
    const { AuthGuard } = await import('@/Pages/guards/AuthGuard')
    mockAuthState = { isAuthenticated: true, isInitializing: false }
    mockCryptoState = { isUnlocked: false }
    ls['privateKeyBundle'] = 'some-bundle'

    const html = renderToStaticMarkup(React.createElement(AuthGuard))
    expect(html).toContain('data-unlock')
  })

  it('renders Outlet when authenticated, initialized, and key unlocked', async () => {
    const { AuthGuard } = await import('@/Pages/guards/AuthGuard')
    mockAuthState = { isAuthenticated: true, isInitializing: false }
    mockCryptoState = { isUnlocked: true }

    const html = renderToStaticMarkup(React.createElement(AuthGuard))
    expect(html).toContain('data-outlet')
  })

  it('renders Outlet when authenticated, initialized, unlocked, no bundle', async () => {
    const { AuthGuard } = await import('@/Pages/guards/AuthGuard')
    mockAuthState = { isAuthenticated: true, isInitializing: false }
    mockCryptoState = { isUnlocked: false }
    // no bundle → Gate 3 does not trigger

    const html = renderToStaticMarkup(React.createElement(AuthGuard))
    expect(html).toContain('data-outlet')
  })
})

// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

let mockIsAuthenticated = false
const mockHandleLogin = vi.fn().mockResolvedValue(true)
const mockHandleRegister = vi.fn().mockResolvedValue(true)

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    handleLogin: mockHandleLogin,
    handleRegister: mockHandleRegister,
  }),
}))

vi.mock('react-router', () => ({
  Navigate: ({ to }: { to: string }) =>
    React.createElement('div', { 'data-navigate': to }),
}))

vi.mock('lucide-react', () => ({
  Eye: () => React.createElement('span', { 'data-icon': 'eye' }),
  EyeOff: () => React.createElement('span', { 'data-icon': 'eye-off' }),
  ShieldCheck: () => React.createElement('span', { 'data-icon': 'shield-check' }),
}))

vi.mock('@/assets/icons/cipher-logo-primary.svg', () => ({ default: 'logo.svg' }))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', {
      type: props['type'] as string,
      'data-testid': props['data-testid'] as string,
      placeholder: props['placeholder'] as string,
      required: props['required'] as boolean,
      disabled: props['disabled'] as boolean,
      minLength: props['minLength'] as number,
      value: props['value'] as string,
    }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    type,
    disabled,
    'data-testid': testId,
  }: {
    children?: React.ReactNode
    type?: string
    disabled?: boolean
    'data-testid'?: string
  }) =>
    React.createElement('button', { type, disabled, 'data-testid': testId }, children),
}))

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => React.createElement('span', { 'data-testid': 'spinner' }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function render() {
  const { default: AuthForm } = await import('@/components/Auth/AuthForm')
  return renderToStaticMarkup(React.createElement(AuthForm))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthenticated = false
  })

  describe('when authenticated', () => {
    it('redirects to /chat', async () => {
      mockIsAuthenticated = true
      const html = await render()
      expect(html).toContain('data-navigate="/chat"')
    })
  })

  describe('login mode (default)', () => {
    it('shows "Welcome back" title', async () => {
      const html = await render()
      expect(html).toContain('Welcome back')
    })

    it('shows the sign-in description', async () => {
      const html = await render()
      expect(html).toContain('Sign in to continue to Cipher Chat')
    })

    it('renders username and password inputs', async () => {
      const html = await render()
      expect(html).toContain('data-testid="username-input"')
      expect(html).toContain('data-testid="password-input"')
    })

    it('does not render display name input in login mode', async () => {
      const html = await render()
      expect(html).not.toContain('data-testid="display-name-input"')
    })

    it('renders "Sign In" button text', async () => {
      const html = await render()
      expect(html).toContain('Sign In')
    })

    it('renders switch-to-register button', async () => {
      const html = await render()
      expect(html).toContain('data-testid="switch-to-register-btn"')
      expect(html).toContain('Sign up')
    })

    it('renders E2E security note', async () => {
      const html = await render()
      expect(html).toContain('End-to-end encrypted')
    })
  })

  describe('password visibility toggle', () => {
    it('password input defaults to type="password"', async () => {
      const html = await render()
      expect(html).toContain('type="password"')
    })

    it('renders eye icon for show-password toggle', async () => {
      const html = await render()
      expect(html).toContain('data-icon="eye"')
    })
  })

  describe('security note', () => {
    it('renders shield-check icon', async () => {
      const html = await render()
      expect(html).toContain('data-icon="shield-check"')
    })

    it('mentions zero knowledge', async () => {
      const html = await render()
      expect(html).toContain('Zero knowledge')
    })
  })
})

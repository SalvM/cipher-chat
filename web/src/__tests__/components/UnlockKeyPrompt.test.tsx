// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUnlockWithPassword = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/stores/cryptoStore', () => ({
  useCryptoStore: () => ({ unlockWithPassword: mockUnlockWithPassword }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ logout: mockLogout }),
}))

vi.mock('@/components/ui/input', () => ({
  Input: (props: Record<string, unknown>) =>
    React.createElement('input', { 'data-label': props['label'], type: props['type'], ...props }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    intent,
    disabled,
    onClick,
    size,
  }: {
    children?: React.ReactNode
    intent?: string
    disabled?: boolean
    onClick?: () => void
    size?: string
  }) =>
    React.createElement(
      'button',
      { 'data-intent': intent, disabled, onClick, 'data-size': size },
      children
    ),
}))

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UnlockKeyPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the title', async () => {
    const { UnlockKeyPrompt } = await import('@/components/Auth/UnlockKeyPrompt')
    const html = renderToStaticMarkup(React.createElement(UnlockKeyPrompt))
    expect(html).toContain('Unlock encryption keys')
  })

  it('renders a password input', async () => {
    const { UnlockKeyPrompt } = await import('@/components/Auth/UnlockKeyPrompt')
    const html = renderToStaticMarkup(React.createElement(UnlockKeyPrompt))
    expect(html).toContain('type="password"')
  })

  it('renders the Unlock button with primary intent', async () => {
    const { UnlockKeyPrompt } = await import('@/components/Auth/UnlockKeyPrompt')
    const html = renderToStaticMarkup(React.createElement(UnlockKeyPrompt))
    expect(html).toContain('data-intent="primary"')
    expect(html).toContain('Unlock')
  })

  it('renders the Sign out button with ghost intent', async () => {
    const { UnlockKeyPrompt } = await import('@/components/Auth/UnlockKeyPrompt')
    const html = renderToStaticMarkup(React.createElement(UnlockKeyPrompt))
    expect(html).toContain('data-intent="ghost"')
    expect(html).toContain('Sign out')
  })

  it('Unlock button is disabled when password is empty (initial state)', async () => {
    const { UnlockKeyPrompt } = await import('@/components/Auth/UnlockKeyPrompt')
    const html = renderToStaticMarkup(React.createElement(UnlockKeyPrompt))
    // Primary button disabled because password state starts empty
    expect(html).toMatch(/data-intent="primary"[^>]*disabled/)
  })

  it('renders description about password decryption', async () => {
    const { UnlockKeyPrompt } = await import('@/components/Auth/UnlockKeyPrompt')
    const html = renderToStaticMarkup(React.createElement(UnlockKeyPrompt))
    expect(html).toContain('private key')
  })
})

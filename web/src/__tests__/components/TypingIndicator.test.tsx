// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement('div', props, children),
  },
}))

describe('TypingIndicator', () => {
  it('renders nothing for empty users array', async () => {
    const { default: TypingIndicator } = await import('@/components/Chat/TypingIndicator')
    const html = renderToStaticMarkup(
      React.createElement(TypingIndicator, { users: [] })
    )
    expect(html).toBe('')
  })

  it('shows single user typing label', async () => {
    const { default: TypingIndicator } = await import('@/components/Chat/TypingIndicator')
    const html = renderToStaticMarkup(
      React.createElement(TypingIndicator, { users: ['alice'] })
    )
    expect(html).toContain('alice is typing...')
  })

  it('shows two users typing label', async () => {
    const { default: TypingIndicator } = await import('@/components/Chat/TypingIndicator')
    const html = renderToStaticMarkup(
      React.createElement(TypingIndicator, { users: ['alice', 'bob'] })
    )
    expect(html).toContain('alice and bob are typing...')
  })

  it('shows first user and others for 3+ users', async () => {
    const { default: TypingIndicator } = await import('@/components/Chat/TypingIndicator')
    const html = renderToStaticMarkup(
      React.createElement(TypingIndicator, { users: ['alice', 'bob', 'charlie'] })
    )
    expect(html).toContain('alice and others are typing...')
  })

  it('renders three animated dots', async () => {
    const { default: TypingIndicator } = await import('@/components/Chat/TypingIndicator')
    const html = renderToStaticMarkup(
      React.createElement(TypingIndicator, { users: ['alice'] })
    )
    expect(html.match(/animate-bounce/g)?.length).toBe(3)
  })
})

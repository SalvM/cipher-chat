// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Status } from '@/types/utilityTypes'

describe('UserStatusDot', () => {
  it.each<[Status, string]>([
    ['online', 'bg-online'],
    ['offline', 'bg-offline'],
    ['invisible', 'bg-offline'],
    ['away', 'bg-idle'],
    ['dnd', 'bg-dnd'],
  ])('status "%s" applies class "%s"', async (status, expectedClass) => {
    const { UserStatusDot } = await import('@/components/Chat/UserStatusDot')
    const html = renderToStaticMarkup(
      React.createElement(UserStatusDot, { status })
    )
    expect(html).toContain(expectedClass)
  })

  it('online status has glow shadow', async () => {
    const { UserStatusDot } = await import('@/components/Chat/UserStatusDot')
    const html = renderToStaticMarkup(
      React.createElement(UserStatusDot, { status: 'online' })
    )
    expect(html).toContain('shadow-[0_0_6px_var(--color-online)]')
  })

  it('non-online statuses do not have online glow', async () => {
    const { UserStatusDot } = await import('@/components/Chat/UserStatusDot')
    for (const status of ['offline', 'away', 'dnd', 'invisible'] as Status[]) {
      const html = renderToStaticMarkup(
        React.createElement(UserStatusDot, { status })
      )
      expect(html).not.toContain('shadow-[0_0_6px_var(--color-online)]')
    }
  })

  it('unknown status falls back to bg-offline', async () => {
    const { UserStatusDot } = await import('@/components/Chat/UserStatusDot')
    const html = renderToStaticMarkup(
      React.createElement(UserStatusDot, { status: 'unknown' as Status })
    )
    expect(html).toContain('bg-offline')
  })

  it('always renders the border class', async () => {
    const { UserStatusDot } = await import('@/components/Chat/UserStatusDot')
    const html = renderToStaticMarkup(
      React.createElement(UserStatusDot, { status: 'online' })
    )
    expect(html).toContain('border-overlay')
  })
})

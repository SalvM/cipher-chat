// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import useFormattedTimeLeft from '@/hooks/useFormattedTimeLeft'

let captured: string | null = null

const Wrapper = ({
  t,
  opts,
}: {
  t: number | null
  opts?: { includeSeconds?: boolean }
}) => {
  captured = useFormattedTimeLeft(t, opts)
  return React.createElement('span', null)
}

const format = (
  t: number | null,
  opts?: { includeSeconds?: boolean }
): string | null => {
  renderToStaticMarkup(React.createElement(Wrapper, { t, opts }))
  return captured
}

describe('useFormattedTimeLeft', () => {
  it('returns null for null input', () => {
    expect(format(null)).toBeNull()
  })

  it('returns days with ceiling', () => {
    expect(format(86400)).toBe('1 d')
    expect(format(86401)).toBe('2 d')
    expect(format(7 * 86400)).toBe('7 d')
  })

  it('returns hours with ceiling', () => {
    expect(format(3600)).toBe('1 h')
    expect(format(3601)).toBe('2 h')
    expect(format(7200)).toBe('2 h')
  })

  it('returns minutes with ceiling', () => {
    expect(format(60)).toBe('1 min')
    expect(format(90)).toBe('2 min')
    expect(format(3599)).toBe('60 min')
  })

  it('returns "< 1 min" for sub-minute without includeSeconds', () => {
    expect(format(59)).toBe('< 1 min')
    expect(format(1)).toBe('< 1 min')
  })

  it('returns seconds when includeSeconds is true', () => {
    expect(format(30, { includeSeconds: true })).toBe('30 s')
    expect(format(1, { includeSeconds: true })).toBe('1 s')
  })

  it('returns "< 1 min" for 0 seconds even with includeSeconds', () => {
    expect(format(0, { includeSeconds: true })).toBe('< 1 min')
  })

  it('boundary: exactly one day is "1 d" not hours', () => {
    expect(format(86400)).toBe('1 d')
  })

  it('boundary: exactly one hour is "1 h" not minutes', () => {
    expect(format(3600)).toBe('1 h')
  })

  it('boundary: exactly one minute is "1 min" not sub-minute', () => {
    expect(format(60)).toBe('1 min')
  })
})

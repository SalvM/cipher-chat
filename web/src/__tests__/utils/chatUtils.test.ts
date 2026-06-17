import { describe, it, expect } from 'vitest'
import {
  formatTimerLabel,
  statusColors,
  statusLabels,
  TIMER_OPTIONS,
  EMOJI_OPTIONS,
} from '@/utils/chatUtils'

describe('formatTimerLabel', () => {
  it('returns correct label for known value', () => {
    expect(formatTimerLabel(0)).toBe('Off')
    expect(formatTimerLabel(5)).toBe('5 minutes')
    expect(formatTimerLabel(60)).toBe('1 hour')
    expect(formatTimerLabel(10080)).toBe('7 days')
  })

  it('returns Off for unknown value', () => {
    expect(formatTimerLabel(9999)).toBe('Off')
  })
})

describe('statusColors', () => {
  it('has entry for every status', () => {
    const statuses = ['online', 'offline', 'away', 'dnd', 'invisible'] as const
    for (const s of statuses) {
      expect(statusColors[s]).toBeDefined()
    }
  })
})

describe('statusLabels', () => {
  it('maps dnd to Do Not Disturb', () => {
    expect(statusLabels.dnd).toBe('Do Not Disturb')
  })
})

describe('TIMER_OPTIONS', () => {
  it('first option is Off with value 0', () => {
    expect(TIMER_OPTIONS[0]).toEqual({ value: 0, label: 'Off' })
  })
})

describe('EMOJI_OPTIONS', () => {
  it('has 8 emoji', () => {
    expect(EMOJI_OPTIONS).toHaveLength(8)
  })
})

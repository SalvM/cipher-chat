import { describe, it, expect, beforeEach } from 'vitest'

describe('counterStore', () => {
  beforeEach(async () => {
    const { useCounterStore } = await import('@/stores/counterStore')
    useCounterStore.setState({ count: 0 })
  })

  it('starts at 0', async () => {
    const { useCounterStore } = await import('@/stores/counterStore')
    expect(useCounterStore.getState().count).toBe(0)
  })

  it('increment adds 1', async () => {
    const { useCounterStore } = await import('@/stores/counterStore')
    useCounterStore.getState().increment()
    expect(useCounterStore.getState().count).toBe(1)
  })

  it('decrement subtracts 1', async () => {
    const { useCounterStore } = await import('@/stores/counterStore')
    useCounterStore.getState().decrement()
    expect(useCounterStore.getState().count).toBe(-1)
  })

  it('reset sets count back to 0', async () => {
    const { useCounterStore } = await import('@/stores/counterStore')
    useCounterStore.getState().increment()
    useCounterStore.getState().increment()
    useCounterStore.getState().reset()
    expect(useCounterStore.getState().count).toBe(0)
  })

  it('chained increments accumulate', async () => {
    const { useCounterStore } = await import('@/stores/counterStore')
    const { increment } = useCounterStore.getState()
    increment()
    increment()
    increment()
    expect(useCounterStore.getState().count).toBe(3)
  })
})

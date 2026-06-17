import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Environment stubs ─────────────────────────────────────────────────────────

// API_URL resolves to '' in test (no VITE_BACKEND_URL set), so requests go to
// '' + path (e.g. '/users'). Fetch is fully mocked so no real network calls.

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', mockLocalStorage)

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ── Import after stubs ─────────────────────────────────────────────────────────

import api from '@/services/Api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(
  body: unknown,
  status = 200,
  ok = true
): Response {
  return {
    ok,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Api — Authorization header', () => {
  it('injects Bearer token from localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue('tok-abc')
    mockFetch.mockResolvedValueOnce(makeResponse({ data: 1 }))

    await api.get('/test')

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers.Authorization).toBe('Bearer tok-abc')
  })

  it('omits Authorization when no token in localStorage', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    await api.get('/test')

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers.Authorization).toBeUndefined()
  })
})

describe('Api — Content-Type', () => {
  it('sets Content-Type to application/json for POST with plain body', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    await api.post('/items', { body: { name: 'test' } })

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers['Content-Type']).toBe('application/json')
  })

  it('does NOT set Content-Type for FormData body (browser sets boundary)', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    const fd = new FormData()
    fd.append('file', new Blob(['data']))
    await api.post('/upload', { body: fd })

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers['Content-Type']).toBeUndefined()
    expect(opts.body).toBe(fd)
  })

  it('does NOT set Content-Type for GET requests', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    await api.get('/items')

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers['Content-Type']).toBeUndefined()
  })
})

describe('Api — body serialization', () => {
  it('JSON.stringifies plain object body', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    await api.post('/items', { body: { foo: 'bar' } })

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.body).toBe(JSON.stringify({ foo: 'bar' }))
  })

  it('passes FormData body as-is', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    const fd = new FormData()
    await api.post('/upload', { body: fd })

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.body).toBe(fd)
  })

  it('sends no body for GET without body', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    await api.get('/items')

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.body).toBeUndefined()
  })
})

describe('Api — HTTP methods', () => {
  it.each([
    ['get', 'GET'],
    ['post', 'POST'],
    ['put', 'PUT'],
    ['patch', 'PATCH'],
    ['delete', 'DELETE'],
  ] as const)('api.%s uses method %s', async (helper, method) => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    await api[helper]('/path')

    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.method).toBe(method)
  })
})

describe('Api — response handling', () => {
  it('returns parsed JSON on 2xx', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({ id: 42 }))

    const result = await api.get<{ id: number }>('/items/1')
    expect(result).toEqual({ id: 42 })
  })

  it('returns null when response body is not JSON', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: vi.fn().mockRejectedValue(new SyntaxError('no body')),
    } as unknown as Response)

    const result = await api.delete('/items/1')
    expect(result).toBeNull()
  })

  it('throws ApiError with status and data on 4xx', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(
      makeResponse({ detail: 'Not found' }, 404, false)
    )

    await expect(api.get('/items/999')).rejects.toMatchObject({
      status: 404,
      data: { detail: 'Not found' },
    })
  })

  it('throws ApiError with null data when error body is not JSON', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError('no body')),
    } as unknown as Response)

    await expect(api.get('/broken')).rejects.toMatchObject({
      status: 500,
      data: null,
    })
  })

  it('propagates network errors (fetch rejects)', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    await expect(api.get('/offline')).rejects.toThrow('Failed to fetch')
  })
})

describe('Api — URL construction', () => {
  it('prepends API_URL to path', async () => {
    mockLocalStorage.getItem.mockReturnValue(null)
    mockFetch.mockResolvedValueOnce(makeResponse({}))

    await api.get('/users/me')

    const [url] = mockFetch.mock.calls[0]
    expect(url).toMatch('/users/me')
  })
})

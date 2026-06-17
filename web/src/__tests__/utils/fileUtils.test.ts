import { describe, it, expect, vi, afterEach } from 'vitest'

afterEach(() => vi.unstubAllEnvs())

describe('formatFileSize', () => {
  it('shows bytes for values under 1 KB', async () => {
    const { formatFileSize } = await import('@/utils/fileUtils')
    expect(formatFileSize(500)).toBe('500 B')
  })

  it('shows KB for values between 1 KB and 1 MB', async () => {
    const { formatFileSize } = await import('@/utils/fileUtils')
    expect(formatFileSize(1536)).toBe('1.5 KB')
  })

  it('shows MB for values >= 1 MB', async () => {
    const { formatFileSize } = await import('@/utils/fileUtils')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})

describe('getFileUrl', () => {
  it('builds URL from VITE_BACKEND_URL env var', async () => {
    vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:8001')
    const { getFileUrl } = await import('@/utils/fileUtils')
    expect(getFileUrl('abc123')).toBe('http://localhost:8001/api/files/abc123')
  })
})

describe('isImageFile', () => {
  it('returns true when is_image is true', async () => {
    const { isImageFile } = await import('@/utils/fileUtils')
    expect(isImageFile({ is_image: true })).toBe(true)
  })

  it('returns undefined (no crash) for null input', async () => {
    const { isImageFile } = await import('@/utils/fileUtils')
    expect(isImageFile(null)).toBeUndefined()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ClusterMessage } from '@/types/clusterTypes'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockApiGet, mockApiPost, mockApiPut, mockApiDelete } = vi.hoisted(() => ({
  mockApiGet: vi.fn(),
  mockApiPost: vi.fn(),
  mockApiPut: vi.fn(),
  mockApiDelete: vi.fn(),
}))

const { mockEncryptMessage, mockDecryptMessage } = vi.hoisted(() => ({
  mockEncryptMessage: vi.fn(),
  mockDecryptMessage: vi.fn(),
}))

const { mockGetConversationKey } = vi.hoisted(() => ({
  mockGetConversationKey: vi.fn(),
}))

// ── vi.mock calls ─────────────────────────────────────────────────────────────

vi.mock('@/services/Api', () => ({
  default: { get: mockApiGet, post: mockApiPost, put: mockApiPut, delete: mockApiDelete },
}))

vi.mock('@/services/CryptoService', () => ({
  CryptoService: { encryptMessage: mockEncryptMessage, decryptMessage: mockDecryptMessage },
}))

vi.mock('@/services/KeyService', () => ({
  keyService: { getConversationKey: mockGetConversationKey },
}))

vi.mock('@/stores/conversationStore', () => ({
  useConversationStore: {
    getState: () => ({
      clusters: {
        'cl-1': { _id: 'cl-1', member_details: [{ _id: 'self-1' }, { _id: 'u2' }] },
      },
    }),
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ user: { _id: 'self-1' } }) },
}))

// ── Import after mocks ─────────────────────────────────────────────────────────

import { useClusterMessageStore } from '@/stores/clusterMessageStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockCK = { type: 'secret' } as unknown as CryptoKey
const mockCKEntry = { key: mockCK, version: 1 }

const makeMsg = (
  id: string,
  clusterId = 'cl-1',
  topicId = 't-1',
  content = 'hello'
): ClusterMessage => ({
  _id: id,
  cluster_id: clusterId,
  topic_id: topicId,
  sender_id: 'self-1',
  content,
  edited: false,
  reactions: null,
  attachments: [],
  created_at: '2024-01-01T00:00:00Z',
  edited_at: '2024-01-01T00:00:00Z',
})

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  useClusterMessageStore.setState({ messages: {}, loadingMessages: {} })
})

describe('clusterMessageStore — fetchMessages', () => {
  it('fetches, decrypts, and stores under clusterId/topicId', async () => {
    mockApiGet.mockResolvedValueOnce({ messages: [makeMsg('m1', 'cl-1', 't-1', 'enc')] })
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockDecryptMessage.mockResolvedValueOnce('plaintext')

    await useClusterMessageStore.getState().fetchMessages('cl-1', 't-1')

    const stored = useClusterMessageStore.getState().messages['cl-1']?.['t-1']
    expect(stored).toBeDefined()
    expect(stored!['m1'].content).toBe('plaintext')
  })

  it('stores raw content when key unavailable', async () => {
    mockApiGet.mockResolvedValueOnce({ messages: [makeMsg('m1', 'cl-1', 't-1', 'enc')] })
    mockGetConversationKey.mockRejectedValueOnce(new Error('no key'))

    await useClusterMessageStore.getState().fetchMessages('cl-1', 't-1')

    expect(useClusterMessageStore.getState().messages['cl-1']?.['t-1']?.['m1'].content).toBe('enc')
  })

  it('does not overwrite messages in other topics', async () => {
    useClusterMessageStore.setState({
      messages: { 'cl-1': { 't-2': { m99: makeMsg('m99', 'cl-1', 't-2') } } },
    })
    mockApiGet.mockResolvedValueOnce({ messages: [makeMsg('m1', 'cl-1', 't-1', 'enc')] })
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockDecryptMessage.mockResolvedValueOnce('decrypted')

    await useClusterMessageStore.getState().fetchMessages('cl-1', 't-1')

    expect(useClusterMessageStore.getState().messages['cl-1']?.['t-2']?.['m99']).toBeDefined()
  })

  it('sets and clears loading state', async () => {
    let loadingDuringFetch = false
    mockApiGet.mockImplementationOnce(async () => {
      loadingDuringFetch =
        useClusterMessageStore.getState().loadingMessages['cl-1']?.['t-1']
      return { messages: [] }
    })
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)

    await useClusterMessageStore.getState().fetchMessages('cl-1', 't-1')

    expect(loadingDuringFetch).toBe(true)
    expect(useClusterMessageStore.getState().loadingMessages['cl-1']?.['t-1']).toBe(false)
  })
})

describe('clusterMessageStore — sendMessage', () => {
  it('encrypts content and posts to API', async () => {
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockEncryptMessage.mockResolvedValueOnce('enc-content')
    mockApiPost.mockResolvedValueOnce({})

    const result = await useClusterMessageStore
      .getState()
      .sendMessage({ clusterId: 'cl-1', topicId: 't-1', content: 'hi' })

    expect(result.success).toBe(true)
    expect(mockApiPost).toHaveBeenCalledWith(
      '/clusterMessages',
      expect.objectContaining({
        body: expect.objectContaining({
          content: 'enc-content',
          cluster_id: 'cl-1',
          topic_id: 't-1',
          key_version: 1,
        }),
      })
    )
  })

  it('returns error when key is KEY_PENDING (null CK)', async () => {
    mockGetConversationKey.mockResolvedValueOnce(null)

    const result = await useClusterMessageStore
      .getState()
      .sendMessage({ clusterId: 'cl-1', topicId: 't-1', content: 'hi' })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/key not yet available/i)
  })
})

describe('clusterMessageStore — editMessage', () => {
  it('encrypts, calls API, updates local state with plaintext', async () => {
    useClusterMessageStore.setState({
      messages: { 'cl-1': { 't-1': { m1: makeMsg('m1') } } },
    })
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockEncryptMessage.mockResolvedValueOnce('enc-edited')
    mockApiPut.mockResolvedValueOnce({})

    const result = await useClusterMessageStore
      .getState()
      .editMessage('cl-1', 't-1', 'm1', 'edited')

    expect(result.success).toBe(true)
    expect(mockApiPut).toHaveBeenCalledWith(
      '/clusterMessages/m1',
      expect.objectContaining({ body: expect.objectContaining({ content: 'enc-edited' }) })
    )
    expect(
      useClusterMessageStore.getState().messages['cl-1']?.['t-1']?.['m1']?.content
    ).toBe('edited')
  })

  it('returns error when topic not loaded', async () => {
    const result = await useClusterMessageStore
      .getState()
      .editMessage('cl-1', 't-1', 'm1', 'text')
    expect(result.success).toBe(false)
  })
})

describe('clusterMessageStore — deleteMessage', () => {
  it('calls API and removes message', async () => {
    useClusterMessageStore.setState({
      messages: { 'cl-1': { 't-1': { m1: makeMsg('m1'), m2: makeMsg('m2') } } },
    })
    mockApiDelete.mockResolvedValueOnce(null)

    const result = await useClusterMessageStore
      .getState()
      .deleteMessage('cl-1', 't-1', 'm1')

    expect(result.success).toBe(true)
    expect(mockApiDelete).toHaveBeenCalledWith('/clusterMessages/m1')
    const remaining = useClusterMessageStore.getState().messages['cl-1']?.['t-1']
    expect(remaining?.['m1']).toBeUndefined()
    expect(remaining?.['m2']).toBeDefined()
  })

  it('returns error when topic not loaded', async () => {
    const result = await useClusterMessageStore
      .getState()
      .deleteMessage('cl-1', 't-1', 'm1')
    expect(result.success).toBe(false)
  })
})

describe('clusterMessageStore — reactions', () => {
  it('addReaction posts to API', async () => {
    mockApiPost.mockResolvedValueOnce({})
    const result = await useClusterMessageStore.getState().addReaction('m1', '👍')
    expect(result.success).toBe(true)
    expect(mockApiPost).toHaveBeenCalledWith('/clusterMessages/m1/reactions', {
      body: { emoji: '👍' },
    })
  })

  it('removeReaction calls DELETE with encoded emoji', async () => {
    mockApiDelete.mockResolvedValueOnce(null)
    const result = await useClusterMessageStore.getState().removeReaction('m1', '❤️')
    expect(result.success).toBe(true)
    expect(mockApiDelete).toHaveBeenCalledWith(
      `/clusterMessages/m1/reactions/${encodeURIComponent('❤️')}`
    )
  })
})

describe('clusterMessageStore — clearTopic / clearCluster', () => {
  it('clearTopic removes only the specified topic', () => {
    useClusterMessageStore.setState({
      messages: {
        'cl-1': {
          't-1': { m1: makeMsg('m1') },
          't-2': { m2: makeMsg('m2', 'cl-1', 't-2') },
        },
      },
    })
    useClusterMessageStore.getState().clearTopic('cl-1', 't-1')

    const cl = useClusterMessageStore.getState().messages['cl-1']
    expect(cl?.['t-1']).toBeUndefined()
    expect(cl?.['t-2']).toBeDefined()
  })

  it('clearCluster removes entire cluster, leaves others', () => {
    useClusterMessageStore.setState({
      messages: {
        'cl-1': { 't-1': { m1: makeMsg('m1') } },
        'cl-2': { 't-1': { m2: makeMsg('m2', 'cl-2', 't-1') } },
      },
    })
    useClusterMessageStore.getState().clearCluster('cl-1')

    expect(useClusterMessageStore.getState().messages['cl-1']).toBeUndefined()
    expect(useClusterMessageStore.getState().messages['cl-2']).toBeDefined()
  })
})

describe('clusterMessageStore — WebSocket actions', () => {
  it('addMessageFromWs appends to existing topic', () => {
    useClusterMessageStore.setState({
      messages: { 'cl-1': { 't-1': { m1: makeMsg('m1') } } },
    })
    useClusterMessageStore.getState().addMessageFromWs({
      clusterId: 'cl-1',
      topicId: 't-1',
      message: makeMsg('m2'),
    })

    const msgs = useClusterMessageStore.getState().messages['cl-1']?.['t-1']
    expect(msgs?.['m1']).toBeDefined()
    expect(msgs?.['m2']).toBeDefined()
  })

  it('addMessageFromWs ignores when topic not loaded', () => {
    useClusterMessageStore.getState().addMessageFromWs({
      clusterId: 'cl-1',
      topicId: 't-1',
      message: makeMsg('m1'),
    })
    expect(useClusterMessageStore.getState().messages).toEqual({})
  })

  it('updateMessageFromWs merges updates', () => {
    useClusterMessageStore.setState({
      messages: { 'cl-1': { 't-1': { m1: makeMsg('m1', 'cl-1', 't-1', 'old') } } },
    })
    useClusterMessageStore.getState().updateMessageFromWs({
      clusterId: 'cl-1',
      topicId: 't-1',
      messageId: 'm1',
      updates: { content: 'new', edited: true },
      edited_at: '2024-02-01T00:00:00Z',
    })

    const msg = useClusterMessageStore.getState().messages['cl-1']?.['t-1']?.['m1']
    expect(msg?.content).toBe('new')
    expect(msg?.edited).toBe(true)
  })

  it('removeMessageFromWs deletes message', () => {
    useClusterMessageStore.setState({
      messages: { 'cl-1': { 't-1': { m1: makeMsg('m1'), m2: makeMsg('m2') } } },
    })
    useClusterMessageStore.getState().removeMessageFromWs({
      clusterId: 'cl-1',
      topicId: 't-1',
      messageId: 'm1',
    })

    const msgs = useClusterMessageStore.getState().messages['cl-1']?.['t-1']
    expect(msgs?.['m1']).toBeUndefined()
    expect(msgs?.['m2']).toBeDefined()
  })

  it('updateMessageReactionFromWS adds reaction', () => {
    useClusterMessageStore.setState({
      messages: { 'cl-1': { 't-1': { m1: { ...makeMsg('m1'), reactions: {} } } } },
    })
    useClusterMessageStore.getState().updateMessageReactionFromWS({
      clusterId: 'cl-1',
      topicId: 't-1',
      messageId: 'm1',
      emoji: '🔥',
      userId: 'u2',
      action: 'add',
    })

    const reactions =
      useClusterMessageStore.getState().messages['cl-1']?.['t-1']?.['m1']?.reactions
    expect(reactions?.['🔥']).toContain('u2')
  })

  it('updateMessageReactionFromWS removes reaction and cleans up empty key', () => {
    useClusterMessageStore.setState({
      messages: {
        'cl-1': { 't-1': { m1: { ...makeMsg('m1'), reactions: { '🔥': ['u2'] } } } },
      },
    })
    useClusterMessageStore.getState().updateMessageReactionFromWS({
      clusterId: 'cl-1',
      topicId: 't-1',
      messageId: 'm1',
      emoji: '🔥',
      userId: 'u2',
      action: 'remove',
    })

    const reactions =
      useClusterMessageStore.getState().messages['cl-1']?.['t-1']?.['m1']?.reactions
    expect(reactions?.['🔥']).toBeUndefined()
  })
})

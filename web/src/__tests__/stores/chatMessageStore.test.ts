import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Message } from '@/types/messageTypes'

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
      chats: {
        'chat-1': { _id: 'chat-1', otherUser: { _id: 'u2' }, participants: ['self-1', 'u2'] },
      },
    }),
  },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ user: { _id: 'self-1' } }) },
}))

// ── Import after mocks ─────────────────────────────────────────────────────────

import { useChatMessageStore } from '@/stores/chatMessageStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

const mockCK = { type: 'secret' } as unknown as CryptoKey
const mockCKEntry = { key: mockCK, version: 1 }

const makeMsg = (id: string, chatId = 'chat-1', content = 'hello'): Message => ({
  _id: id,
  chat_id: chatId,
  sender_id: 'self-1',
  content,
  edited: false,
  reactions: null,
  attachments: [],
  created_at: '2024-01-01T00:00:00Z',
  edited_at: '2024-01-01T00:00:00Z',
  read_by: [],
})

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  useChatMessageStore.setState({ messages: {}, loadingMessages: {} })
})

describe('chatMessageStore — fetchMessages', () => {
  it('fetches, decrypts, and stores messages', async () => {
    mockApiGet.mockResolvedValueOnce({ messages: [makeMsg('m1', 'chat-1', 'enc-content')] })
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockDecryptMessage.mockResolvedValueOnce('hello plaintext')

    await useChatMessageStore.getState().fetchMessages('chat-1')

    const stored = useChatMessageStore.getState().messages['chat-1']
    expect(stored).toBeDefined()
    expect(stored['m1'].content).toBe('hello plaintext')
    expect(mockDecryptMessage).toHaveBeenCalledWith(mockCK, 'enc-content')
  })

  it('stores raw content when key unavailable', async () => {
    mockApiGet.mockResolvedValueOnce({ messages: [makeMsg('m1', 'chat-1', 'enc')] })
    mockGetConversationKey.mockRejectedValueOnce(new Error('no key'))

    await useChatMessageStore.getState().fetchMessages('chat-1')

    expect(useChatMessageStore.getState().messages['chat-1']['m1'].content).toBe('enc')
  })

  it('decrypts reply_to_content when present', async () => {
    const msg: Message = { ...makeMsg('m1', 'chat-1', 'enc-body'), reply_to_content: 'enc-reply' }
    mockApiGet.mockResolvedValueOnce({ messages: [msg] })
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockDecryptMessage
      .mockResolvedValueOnce('body plaintext')
      .mockResolvedValueOnce('reply plaintext')

    await useChatMessageStore.getState().fetchMessages('chat-1')

    const stored = useChatMessageStore.getState().messages['chat-1']['m1']
    expect(stored.content).toBe('body plaintext')
    expect(stored.reply_to_content).toBe('reply plaintext')
  })

  it('sets and clears loading state', async () => {
    let loadingDuringFetch = false
    mockApiGet.mockImplementationOnce(async () => {
      loadingDuringFetch = useChatMessageStore.getState().loadingMessages['chat-1']
      return { messages: [] }
    })
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)

    await useChatMessageStore.getState().fetchMessages('chat-1')

    expect(loadingDuringFetch).toBe(true)
    expect(useChatMessageStore.getState().loadingMessages['chat-1']).toBe(false)
  })
})

describe('chatMessageStore — sendMessage', () => {
  it('encrypts content and posts to API', async () => {
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockEncryptMessage.mockResolvedValueOnce('enc-content')
    mockApiPost.mockResolvedValueOnce({})

    const result = await useChatMessageStore
      .getState()
      .sendMessage({ chatId: 'chat-1', content: 'hello', disappearingMinutes: 0 })

    expect(result.success).toBe(true)
    expect(mockEncryptMessage).toHaveBeenCalledWith(mockCK, 'hello')
    expect(mockApiPost).toHaveBeenCalledWith(
      '/messages',
      expect.objectContaining({
        body: expect.objectContaining({ content: 'enc-content', chat_id: 'chat-1', key_version: 1 }),
      })
    )
  })

  it('returns error when key is KEY_PENDING (null CK)', async () => {
    mockGetConversationKey.mockResolvedValueOnce(null)

    const result = await useChatMessageStore
      .getState()
      .sendMessage({ chatId: 'chat-1', content: 'hi', disappearingMinutes: 0 })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/key not yet available/i)
    expect(mockApiPost).not.toHaveBeenCalled()
  })

  it('returns error when API call fails', async () => {
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockEncryptMessage.mockResolvedValueOnce('enc')
    mockApiPost.mockRejectedValueOnce({ data: { detail: 'Server error' } })

    const result = await useChatMessageStore
      .getState()
      .sendMessage({ chatId: 'chat-1', content: 'hi', disappearingMinutes: 0 })

    expect(result.success).toBe(false)
    expect(result.error).toBe('Server error')
  })
})

describe('chatMessageStore — editMessage', () => {
  it('encrypts, calls API, and updates local state with plaintext', async () => {
    useChatMessageStore.setState({ messages: { 'chat-1': { m1: makeMsg('m1') } } })
    mockGetConversationKey.mockResolvedValueOnce(mockCKEntry)
    mockEncryptMessage.mockResolvedValueOnce('enc-edited')
    mockApiPut.mockResolvedValueOnce({})

    const result = await useChatMessageStore.getState().editMessage('chat-1', 'm1', 'edited text')

    expect(result.success).toBe(true)
    expect(mockApiPut).toHaveBeenCalledWith(
      '/messages/m1',
      expect.objectContaining({ body: expect.objectContaining({ content: 'enc-edited' }) })
    )
    expect(useChatMessageStore.getState().messages['chat-1']['m1'].content).toBe('edited text')
  })

  it('rejects when chat messages not loaded', async () => {
    await expect(
      useChatMessageStore.getState().editMessage('chat-1', 'm1', 'text')
    ).rejects.toThrow()
  })
})

describe('chatMessageStore — deleteMessage', () => {
  it('calls API and removes message from local state', async () => {
    useChatMessageStore.setState({
      messages: { 'chat-1': { m1: makeMsg('m1'), m2: makeMsg('m2') } },
    })
    mockApiDelete.mockResolvedValueOnce(null)

    const result = await useChatMessageStore.getState().deleteMessage('chat-1', 'm1')

    expect(result.success).toBe(true)
    expect(mockApiDelete).toHaveBeenCalledWith('/messages/m1')
    const remaining = useChatMessageStore.getState().messages['chat-1']
    expect(remaining['m1']).toBeUndefined()
    expect(remaining['m2']).toBeDefined()
  })

  it('rejects when chat messages not loaded', async () => {
    await expect(
      useChatMessageStore.getState().deleteMessage('chat-1', 'm1')
    ).rejects.toThrow()
  })
})

describe('chatMessageStore — reactions', () => {
  it('addReaction posts to API', async () => {
    mockApiPost.mockResolvedValueOnce({})
    const result = await useChatMessageStore.getState().addReaction('m1', '👍')
    expect(result.success).toBe(true)
    expect(mockApiPost).toHaveBeenCalledWith('/messages/m1/reactions', { body: { emoji: '👍' } })
  })

  it('removeReaction calls DELETE with encoded emoji', async () => {
    mockApiDelete.mockResolvedValueOnce(null)
    const result = await useChatMessageStore.getState().removeReaction('m1', '👍')
    expect(result.success).toBe(true)
    expect(mockApiDelete).toHaveBeenCalledWith(
      `/messages/m1/reactions/${encodeURIComponent('👍')}`
    )
  })
})

describe('chatMessageStore — WebSocket actions', () => {
  it('addMessageFromWs appends message to existing chat', () => {
    useChatMessageStore.setState({ messages: { 'chat-1': { m1: makeMsg('m1') } } })
    useChatMessageStore.getState().addMessageFromWs(makeMsg('m2'))

    const msgs = useChatMessageStore.getState().messages['chat-1']
    expect(msgs['m1']).toBeDefined()
    expect(msgs['m2']).toBeDefined()
  })

  it('addMessageFromWs ignores message with no chat_id', () => {
    useChatMessageStore.getState().addMessageFromWs({ ...makeMsg('m1'), chat_id: null as any })
    expect(useChatMessageStore.getState().messages).toEqual({})
  })

  it('updateMessageFromWs merges updates into existing message', () => {
    useChatMessageStore.setState({ messages: { 'chat-1': { m1: makeMsg('m1', 'chat-1', 'old') } } })
    useChatMessageStore.getState().updateMessageFromWs({
      chatId: 'chat-1',
      messageId: 'm1',
      updates: { content: 'new', edited: true },
      edited_at: '2024-02-01T00:00:00Z',
    })

    const msg = useChatMessageStore.getState().messages['chat-1']['m1']
    expect(msg.content).toBe('new')
    expect(msg.edited).toBe(true)
    expect(msg.edited_at).toBe('2024-02-01T00:00:00Z')
  })

  it('removeMessageFromWs deletes message from store', () => {
    useChatMessageStore.setState({
      messages: { 'chat-1': { m1: makeMsg('m1'), m2: makeMsg('m2') } },
    })
    useChatMessageStore.getState().removeMessageFromWs('chat-1', 'm1')

    const msgs = useChatMessageStore.getState().messages['chat-1']
    expect(msgs['m1']).toBeUndefined()
    expect(msgs['m2']).toBeDefined()
  })

  it('updateMessageReactionFromWS adds reaction', () => {
    useChatMessageStore.setState({
      messages: { 'chat-1': { m1: { ...makeMsg('m1'), reactions: {} } } },
    })
    useChatMessageStore.getState().updateMessageReactionFromWS({
      chatId: 'chat-1',
      messageId: 'm1',
      emoji: '👍',
      userId: 'u2',
      action: 'add',
    })

    const reactions = useChatMessageStore.getState().messages['chat-1']['m1'].reactions
    expect(reactions?.['👍']).toContain('u2')
  })

  it('updateMessageReactionFromWS removes reaction and deletes key when empty', () => {
    useChatMessageStore.setState({
      messages: { 'chat-1': { m1: { ...makeMsg('m1'), reactions: { '👍': ['u2'] } } } },
    })
    useChatMessageStore.getState().updateMessageReactionFromWS({
      chatId: 'chat-1',
      messageId: 'm1',
      emoji: '👍',
      userId: 'u2',
      action: 'remove',
    })

    const reactions = useChatMessageStore.getState().messages['chat-1']['m1'].reactions
    expect(reactions?.['👍']).toBeUndefined()
  })
})

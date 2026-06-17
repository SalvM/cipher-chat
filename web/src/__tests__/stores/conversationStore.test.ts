import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Chat } from '@/types/chatTypes'
import type { Cluster } from '@/types/clusterTypes'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockDelete = vi.fn()
const mockPut = vi.fn()

vi.mock('@/services/Api', () => ({
  default: { get: mockGet, post: mockPost, delete: mockDelete, put: mockPut },
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: { getState: () => ({ user: { _id: 'self-1' } }) },
}))

vi.mock('@/services/KeyService', () => ({
  keyService: { getConversationKey: vi.fn() },
}))

// ── Shared mock data ───────────────────────────────────────────────────────────

const mockUser = (id: string) => ({
  _id: id, username: `user_${id}`, username_lower: `user_${id}`,
  display_name: `User ${id}`, status: 'online' as const,
})

const mockChat = (id: string): Chat => ({
  _id: id,
  participants: ['self-1', 'u2'],
  otherUser: mockUser('u2'),
  disappearing_minutes: null,
  created_at: '2024-01-01T00:00:00Z',
})

const mockTopic = (id: string) => ({
  _id: id,
  name: `Topic ${id}`,
  description: 'desc',
  created_at: '2024-01-01T00:00:00Z',
  disappearing_minutes: 0,
})

const mockCluster = (id: string): Cluster => ({
  _id: id,
  name: `Cluster ${id}`,
  description: 'a cluster',
  owner_id: 'self-1',
  created_at: '2024-01-01T00:00:00Z',
  members: [mockUser('self-1')],
  member_details: [mockUser('self-1')],
  topics: [mockTopic('t1')],
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('conversationStore — chats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetchChats populates chats record indexed by id', async () => {
    const chats = [mockChat('c1'), mockChat('c2')]
    mockGet.mockResolvedValueOnce({ chats })

    const { useConversationStore } = await import('@/stores/conversationStore')
    useConversationStore.setState({ chats: {} })

    await useConversationStore.getState().fetchChats()

    const state = useConversationStore.getState()
    expect(Object.keys(state.chats)).toHaveLength(2)
    expect(state.chats['c1']).toBeDefined()
    expect(state.chats['c2']).toBeDefined()
    expect(state.chats['c1'].otherUser._id).toBe('u2')
  })

  it('fetchChats sets isLoading false on success', async () => {
    mockGet.mockResolvedValueOnce({ chats: [] })
    const { useConversationStore } = await import('@/stores/conversationStore')
    await useConversationStore.getState().fetchChats()
    expect(useConversationStore.getState().isLoading).toBe(false)
  })

  it('fetchChats sets isLoading false on error', async () => {
    mockGet.mockRejectedValueOnce(new Error('network'))
    const { useConversationStore } = await import('@/stores/conversationStore')
    await useConversationStore.getState().fetchChats()
    expect(useConversationStore.getState().isLoading).toBe(false)
  })

  it('getCurrentChat returns selected chat', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const chat = mockChat('c1')
    useConversationStore.setState({ chats: { c1: chat }, selectedChatId: 'c1' })
    expect(useConversationStore.getState().getCurrentChat()).toEqual(chat)
  })

  it('getCurrentChat returns null when nothing selected', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    useConversationStore.setState({ selectedChatId: null })
    expect(useConversationStore.getState().getCurrentChat()).toBeNull()
  })

  it('setChatLastMessage updates last_message on correct chat', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const chat = mockChat('c1')
    useConversationStore.setState({ chats: { c1: chat } })

    const msg: any = {
      _id: 'm1', chat_id: 'c1', sender_id: 'self-1',
      content: 'hello', created_at: '2024-01-01T00:00:00Z',
    }
    useConversationStore.getState().setChatLastMessage(msg)

    expect(useConversationStore.getState().chats['c1'].last_message).toEqual(msg)
  })

  it('setChatSettings rejects invalid disappearing value', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const chat = mockChat('c1')
    useConversationStore.setState({ chats: { c1: chat } })
    await (useConversationStore.getState().setChatSettings as any)('c1', 999)
    expect(useConversationStore.getState().chats['c1'].disappearing_minutes).toBeNull()
  })

  it('setChatSettings accepts valid disappearing value', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const chat = mockChat('c1')
    useConversationStore.setState({ chats: { c1: chat } })
    await (useConversationStore.getState().setChatSettings as any)('c1', 60)
    expect(useConversationStore.getState().chats['c1'].disappearing_minutes).toBe(60)
  })
})

describe('conversationStore — clusters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetchClusters populates clusters record indexed by id', async () => {
    const clusters = [mockCluster('cl1'), mockCluster('cl2')]
    mockGet.mockResolvedValueOnce({ clusters })

    const { useConversationStore } = await import('@/stores/conversationStore')
    useConversationStore.setState({ clusters: {} })

    await useConversationStore.getState().fetchClusters()

    const state = useConversationStore.getState()
    expect(Object.keys(state.clusters)).toHaveLength(2)
    expect(state.clusters['cl1'].name).toBe('Cluster cl1')
    expect(state.clusters['cl2'].name).toBe('Cluster cl2')
  })

  it('fetchClusters sets isLoading false on error', async () => {
    mockGet.mockRejectedValueOnce(new Error('network'))
    const { useConversationStore } = await import('@/stores/conversationStore')
    await useConversationStore.getState().fetchClusters()
    expect(useConversationStore.getState().isLoading).toBe(false)
  })

  it('getCurrentCluster returns selected cluster', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const cluster = mockCluster('cl1')
    useConversationStore.setState({ clusters: { cl1: cluster }, selectedClusterId: 'cl1' })
    expect(useConversationStore.getState().getCurrentCluster()).toEqual(cluster)
  })

  it('getCurrentTopic returns selected topic within cluster', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const cluster = mockCluster('cl1')
    useConversationStore.setState({
      clusters: { cl1: cluster },
      selectedClusterId: 'cl1',
      selectedTopicId: 't1',
    })
    expect(useConversationStore.getState().getCurrentTopic()?._id).toBe('t1')
  })

  it('getCurrentTopic returns null for unknown topicId', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const cluster = mockCluster('cl1')
    useConversationStore.setState({
      clusters: { cl1: cluster },
      selectedClusterId: 'cl1',
      selectedTopicId: 'no-such-topic',
    })
    expect(useConversationStore.getState().getCurrentTopic()).toBeNull()
  })

  it('newTopicFromWS appends topic to cluster', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const cluster = mockCluster('cl1')
    useConversationStore.setState({ clusters: { cl1: cluster } })

    const newTopic = mockTopic('t2')
    useConversationStore.getState().newTopicFromWS({ clusterId: 'cl1', topic: newTopic })

    const topics = useConversationStore.getState().clusters['cl1'].topics
    expect(topics).toHaveLength(2)
    expect(topics![1]._id).toBe('t2')
  })

  it('updateTopicFromWS updates topic fields', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const cluster = mockCluster('cl1')
    useConversationStore.setState({ clusters: { cl1: cluster } })

    useConversationStore.getState().updateTopicFromWS({
      clusterId: 'cl1', topicId: 't1', name: 'Renamed Topic',
    })

    const topic = useConversationStore.getState().clusters['cl1'].topics![0]
    expect(topic.name).toBe('Renamed Topic')
    expect(topic.description).toBe('desc') // unchanged
  })

  it('deleteClusterFromWS removes cluster and clears selection', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    useConversationStore.setState({
      clusters: { cl1: mockCluster('cl1'), cl2: mockCluster('cl2') },
      selectedClusterId: 'cl1',
      selectedTopicId: 't1',
    })

    useConversationStore.getState().deleteClusterFromWS('cl1')

    const state = useConversationStore.getState()
    expect(state.clusters['cl1']).toBeUndefined()
    expect(state.clusters['cl2']).toBeDefined()
    expect(state.selectedClusterId).toBeNull()
    expect(state.selectedTopicId).toBeNull()
  })

  it('deleteClusterFromWS does not clear selection when other cluster deleted', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    useConversationStore.setState({
      clusters: { cl1: mockCluster('cl1'), cl2: mockCluster('cl2') },
      selectedClusterId: 'cl2',
    })

    useConversationStore.getState().deleteClusterFromWS('cl1')

    expect(useConversationStore.getState().selectedClusterId).toBe('cl2')
  })

  it('deleteTopicFromWS removes topic and clears selectedTopicId', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const cluster = { ...mockCluster('cl1'), topics: [mockTopic('t1'), mockTopic('t2')] }
    useConversationStore.setState({
      clusters: { cl1: cluster },
      selectedClusterId: 'cl1',
      selectedTopicId: 't1',
    })

    useConversationStore.getState().deleteTopicFromWS('cl1', 't1')

    const state = useConversationStore.getState()
    expect(state.clusters['cl1'].topics).toHaveLength(1)
    expect(state.clusters['cl1'].topics![0]._id).toBe('t2')
    expect(state.selectedTopicId).toBeNull()
  })

  it('memberJoinedFromWS adds user to member_details', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    useConversationStore.setState({ clusters: { cl1: mockCluster('cl1') } })

    const newUser = mockUser('u-new')
    useConversationStore.getState().memberJoinedFromWS('cl1', newUser)

    const details = useConversationStore.getState().clusters['cl1'].member_details
    expect(details?.some(m => m._id === 'u-new')).toBe(true)
  })

  it('memberJoinedFromWS is idempotent for existing member', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    useConversationStore.setState({ clusters: { cl1: mockCluster('cl1') } })

    useConversationStore.getState().memberJoinedFromWS('cl1', mockUser('self-1'))

    const details = useConversationStore.getState().clusters['cl1'].member_details
    expect(details?.filter(m => m._id === 'self-1')).toHaveLength(1)
  })

  it('memberLeftFromWS removes user from member_details', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    const cluster = {
      ...mockCluster('cl1'),
      member_details: [mockUser('self-1'), mockUser('u-other')],
    }
    useConversationStore.setState({ clusters: { cl1: cluster } })

    useConversationStore.getState().memberLeftFromWS('cl1', 'u-other')

    const details = useConversationStore.getState().clusters['cl1'].member_details
    expect(details?.some(m => m._id === 'u-other')).toBe(false)
    expect(details?.some(m => m._id === 'self-1')).toBe(true)
  })

  it('updateClusterFromWS updates name and description', async () => {
    const { useConversationStore } = await import('@/stores/conversationStore')
    useConversationStore.setState({ clusters: { cl1: mockCluster('cl1') } })

    useConversationStore.getState().updateClusterFromWS('cl1', 'New Name', 'New Desc')

    const cluster = useConversationStore.getState().clusters['cl1']
    expect(cluster.name).toBe('New Name')
    expect(cluster.description).toBe('New Desc')
  })
})

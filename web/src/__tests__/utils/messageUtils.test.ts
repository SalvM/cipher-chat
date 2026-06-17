import { describe, it, expect } from 'vitest'
import {
  chatMessageArrayToMapConverter,
  chatMessageMapToArrayConvert,
  clusterMessageArrayToMapConverter,
  clusterMessageMapToArrayConvert,
} from '@/utils/messageUtils'
import type { Message } from '@/types/messageTypes'
import type { ClusterMessage } from '@/types/clusterTypes'

const makeMsg = (id: string, createdAt: string): Message =>
  ({
    _id: id,
    chat_id: 'c1',
    sender_id: 'u1',
    content: 'hi',
    created_at: createdAt,
    edited_at: createdAt,
    edited: false,
    read_by: [],
    reactions: {},
    attachments: [],
  }) as Message

const makeClusterMsg = (id: string, createdAt: string): ClusterMessage =>
  ({
    _id: id,
    cluster_id: 'cl1',
    topic_id: 't1',
    sender_id: 'u1',
    content: 'hi',
    created_at: createdAt,
    edited_at: createdAt,
    edited: false,
    read_by: [],
    reactions: {},
    attachments: [],
  }) as ClusterMessage

describe('chatMessageArrayToMapConverter', () => {
  it('indexes messages by _id', () => {
    const msgs = [makeMsg('a', '2024-01-01'), makeMsg('b', '2024-01-02')]
    const map = chatMessageArrayToMapConverter(msgs)
    expect(map['a']).toEqual(msgs[0])
    expect(map['b']).toEqual(msgs[1])
  })

  it('returns empty object for empty array', () => {
    expect(chatMessageArrayToMapConverter([])).toEqual({})
  })
})

describe('chatMessageMapToArrayConvert', () => {
  it('returns messages sorted by created_at ASC', () => {
    const map = {
      b: makeMsg('b', '2024-01-02'),
      a: makeMsg('a', '2024-01-01'),
    }
    const arr = chatMessageMapToArrayConvert(map)
    expect(arr[0]._id).toBe('a')
    expect(arr[1]._id).toBe('b')
  })

  it('handles null/undefined input without crash', () => {
    expect(chatMessageMapToArrayConvert(null as never)).toEqual([])
  })
})

describe('clusterMessageArrayToMapConverter', () => {
  it('indexes cluster messages by _id', () => {
    const msgs = [makeClusterMsg('x', '2024-01-01')]
    const map = clusterMessageArrayToMapConverter(msgs)
    expect(map['x']).toEqual(msgs[0])
  })
})

describe('clusterMessageMapToArrayConvert', () => {
  it('returns cluster messages sorted by created_at ASC', () => {
    const map = {
      z: makeClusterMsg('z', '2024-03-01'),
      y: makeClusterMsg('y', '2024-01-01'),
    }
    const arr = clusterMessageMapToArrayConvert(map)
    expect(arr[0]._id).toBe('y')
    expect(arr[1]._id).toBe('z')
  })
})

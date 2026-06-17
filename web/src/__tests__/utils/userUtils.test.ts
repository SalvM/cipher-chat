import { describe, it, expect } from 'vitest';
import { parseUserFromAPI } from '@/utils/userUtils';

const base = {
  _id: 'u1',
  username: 'jotaro',
  username_lower: 'jotaro',
  display_name: 'Jotaro Kujo',
  avatar: 'https://example.com/jotaro.png',
  status: 'online',
  created_at: '2024-01-01T00:00:00Z',
};

describe('parseUserFromAPI', () => {
  it('maps all fields correctly', () => {
    const user = parseUserFromAPI(base);
    expect(user._id).toBe('u1');
    expect(user.username).toBe('jotaro');
    expect(user.display_name).toBe('Jotaro Kujo');
    expect(user.status).toBe('online');
    expect(user.created_at).toBe('2024-01-01T00:00:00Z');
  });

  it('defaults status to offline when missing', () => {
    const user = parseUserFromAPI({ ...base, status: undefined });
    expect(user.status).toBe('offline');
  });

  it('defaults created_at to current date string when missing', () => {
    const before = new Date().toISOString();
    const user = parseUserFromAPI({ ...base, created_at: undefined });
    const after = new Date().toISOString();
    expect(user.created_at).not.toBe(undefined);
    expect(user.created_at >= before).toBe(true);
    expect(user.created_at <= after).toBe(true);
  });
});

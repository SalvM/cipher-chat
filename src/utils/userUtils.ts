import type { User } from '@/types/userTypes';
import type { Status } from '@/types/utilityTypes';

export function parseUserFromAPI(apiUser: any): User {
  return {
    id: apiUser.id,
    username: apiUser.username,
    username_lower: apiUser.username_lower,
    display_name: apiUser.display_name,
    avatar: apiUser.avatar,
    status: (apiUser.status as Status) || 'offline',
    created_at: apiUser.created_at || new Date().toISOString(),
  };
}

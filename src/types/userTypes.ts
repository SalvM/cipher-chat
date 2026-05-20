import type { ID, Status, Timestamp } from '@/types/utilityTypes';

export interface User {
  id: ID;
  username: string;
  username_lower: string;
  display_name: string;
  avatar?: string;
  bio?: string;
  status: Status;
  created_at?: Timestamp;
}

export interface UserProfile extends User {
  email?: string;
  phone?: string;
}

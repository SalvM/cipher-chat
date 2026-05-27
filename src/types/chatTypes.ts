import type { Message } from '@/types/messageTypes';
import type { User } from '@/types/userTypes';
import type { ID, Timestamp } from '@/types/utilityTypes';

export interface Chat {
  _id: ID;
  partecipants: ID[];
  otherUser: User;
  disappearing_timer: number | null; // minutes, 0 = off
  created_at: Timestamp;
  last_message?: Message;
}

export interface ChatSettings {
  disappearing_timer?: number;
}

import type { Message } from '@/types/messageTypes';
import type { User } from '@/types/userTypes';
import type { ID, Timestamp } from '@/types/utilityTypes';

export interface Chat {
  id: ID;
  type: 'private' | 'group';
  partecipants: ID[];
  disappearing_timer: number | null; // minutes, 0 = off
  created_at: Timestamp;

  // Populated fields
  avatar?: string;
  last_message?: Message;
  participant_details?: User[];
}

export interface ChatSettings {
  disappearing_timer?: number;
}

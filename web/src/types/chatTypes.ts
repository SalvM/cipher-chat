import type { Message } from '@/types/messageTypes';
import type { User } from '@/types/userTypes';
import type { ID, Timestamp } from '@/types/utilityTypes';

export interface ChatInputField {
  inputMessage?: string | null;
  replyToMessage?: Message | null;
}

export interface Chat {
  _id: ID;
  participants: ID[];
  otherUser: User;
  disappearing_minutes: number | null; // minutes, 0 = off
  created_at: Timestamp;
  last_message?: Message;

  // Populated fields
  chatInputField?: ChatInputField;
}

export interface ChatSettings {
  disappearing_minutes?: number;
}

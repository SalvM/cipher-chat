import type { ID, Timestamp } from '@/types/utilityTypes';

export type Emoji = '👍' | '❤️' | '😂' | '😮' | '😢' | '🔥' | '👏' | '🎉';

export interface MessageAttachment {
  id: ID;
  file_id: ID;
  message_id: ID;
  original_name: string;
  file_name: string;
  mime_type: string;
  size: number;
  is_image: boolean;
  created_at: Timestamp;
}

export type MessageReactions = {
  [emoji in Emoji]?: ID[];
};

export interface Message {
  id: ID;
  chat_id: ID;
  sender_id: ID;
  content: string;
  reply_to_id?: ID;
  reply_to_content?: string;
  edited: boolean;
  expires_at?: Timestamp;
  read_by: ID[];
  reactions: MessageReactions | null;
  attachments: MessageAttachment[];
  created_at: Timestamp;
  updated_at: Timestamp;

  // Populated from joins
  sender_username?: string;
  sender_display_name?: string;
  sender_avatar?: string;
}

export interface SendMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

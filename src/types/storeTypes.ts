import type { Message } from '@/types/messageTypes';
import type { ID } from '@/types/utilityTypes';

export type ChatMessageMap = Record<ID, Message>; // messageId -> Message
export type ChatMessagesState = Record<ID, ChatMessageMap>; // chatId -> messages
export type ChatLoadingMessages = Record<ID, boolean>; // chatId -> isLoading (true/false)

export type GenericApiResponse = Promise<{ success: boolean; error?: string }>;

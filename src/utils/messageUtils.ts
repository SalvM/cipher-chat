import type { Message } from '@/types/messageTypes';
import type { ChatMessageMap } from '@/types/storeTypes';

export const chatMessageArrayToMapConverter = (messages: Message[]) =>
  messages.reduce((obj: ChatMessageMap, message) => {
    obj[message._id] = message;
    return obj;
  }, {});

export const chatMessageMapToArrayConvert = (messages: ChatMessageMap) =>
  Object.values(messages ?? {}).sort((a, b) =>
    a.created_at > b.created_at ? 1 : -1
  );

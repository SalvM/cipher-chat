import type { ClusterMessage } from '@/types/clusterTypes';
import type { Message } from '@/types/messageTypes';
import type { ChatMessageMap, TopicMessageMap } from '@/types/storeTypes';

export const chatMessageArrayToMapConverter = (messages: Message[]) =>
  messages.reduce((obj: ChatMessageMap, message) => {
    obj[message._id] = message;
    return obj;
  }, {});

export const chatMessageMapToArrayConvert = (messages: ChatMessageMap) =>
  Object.values(messages ?? {}).sort((a, b) =>
    a.created_at > b.created_at ? 1 : -1
  );

export const clusterMessageArrayToMapConverter = (
  messages: ClusterMessage[]
): TopicMessageMap =>
  messages.reduce<TopicMessageMap>((acc, msg) => {
    acc[msg._id] = msg;
    return acc;
  }, {});

export const clusterMessageMapToArrayConvert = (messages: TopicMessageMap) =>
  Object.values(messages ?? {}).sort((a, b) =>
    a.created_at > b.created_at ? 1 : -1
  );

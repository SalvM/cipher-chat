import type { Emoji } from '@/types/messageTypes';

export const statusColors = {
  online: 'bg-online',
  offline: 'bg-offline',
  away: 'bg-idle',
  dnd: 'bg-dnd',
  invisible: 'bg-offline',
};

export const statusLabels = {
  online: 'Online',
  offline: 'Offline',
  away: 'Away',
  dnd: 'Do Not Disturb',
  invisible: 'Invisible',
};

export const TIMER_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 5, label: '5 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 1440, label: '24 hours' },
  { value: 10080, label: '7 days' },
];

export const EMOJI_OPTIONS: Emoji[] = [
  '👍',
  '❤️',
  '😂',
  '😮',
  '😢',
  '🔥',
  '👏',
  '🎉',
];

export const formatTimerLabel = (minutes: number) =>
  TIMER_OPTIONS.find((o) => o.value === minutes)?.label || 'Off';

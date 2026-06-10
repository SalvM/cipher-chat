import type { Status } from '@/types/utilityTypes';
import { cn } from '@/utils';

interface UserStatusDotProps {
  status: Status;
}

const statusColor: Record<string, string> = {
  online:    'bg-online',
  offline:   'bg-offline',
  invisible: 'bg-offline',
  away:      'bg-idle',
  dnd:       'bg-dnd',
};

export const UserStatusDot = ({ status }: UserStatusDotProps) => (
  <div
    className={cn(
      'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-overlay',
      statusColor[status] ?? 'bg-offline',
      status === 'online' && 'shadow-[0_0_6px_var(--color-online)]'
    )}
  />
);

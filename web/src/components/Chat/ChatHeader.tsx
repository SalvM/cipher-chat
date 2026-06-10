import { Avatar } from '@/components/ui/avatar';
import { DropdownMenu } from '../ui/dropdown-menu';
import {
  statusColors,
  statusLabels,
  formatTimerLabel,
  TIMER_OPTIONS,
} from '@/utils/chatUtils';
import {
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@radix-ui/react-dropdown-menu';
import { MoreVertical, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { ExpireChip } from '@/components/ui/expire-chip';
import type { ChatSettings } from '@/types/chatTypes';
import type { ApiResponse } from '@/types/apiTypes';
import type { ID } from '@/types/utilityTypes';

interface ChatHeaderProps {
  chatId: ID;
  chatAvatar: string;
  chatDisplayName?: string;
  chatStatus: 'online' | 'offline' | 'away' | 'dnd' | 'invisible';
  disappearing_minutes?: number;
  updateChatSettings: (
    chatId: ID,
    settings: ChatSettings
  ) => Promise<ApiResponse>;
}

export const ChatHeader = ({
  chatId,
  chatAvatar,
  chatDisplayName,
  chatStatus,
  disappearing_minutes,
  updateChatSettings,
}: ChatHeaderProps) => {
  return (
    <div className="h-14 px-4 flex items-center justify-between border-b border-border bg-surface/80 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <Avatar
            src={chatAvatar}
            fallback={chatDisplayName?.charAt(0)?.toUpperCase()}
            size="sm"
          />
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${statusColors[chatStatus]} rounded-full border-2 border-surface`}
          />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-text-primary leading-tight">
            {chatDisplayName}
          </h2>
          <p className="text-[11px] text-text-muted leading-none mt-0.5">
            {statusLabels[chatStatus]}
          </p>
        </div>

        {disappearing_minutes ? (
          <ExpireChip label={formatTimerLabel(disappearing_minutes)} />
        ) : null}
      </div>

      <DropdownMenu
        children={
          <>
            <DropdownMenuLabel>Chat Settings</DropdownMenuLabel>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-text-secondary outline-none transition-colors hover:bg-ghost-hover hover:text-ghost-fg-hover">
                <Clock className="w-4 h-4 mr-1" />
                Disappearing Messages
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="z-50 min-w-44 rounded-xl border border-border-strong bg-overlay/95 backdrop-blur-xl p-1.5 shadow-xl">
                {TIMER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() =>
                      updateChatSettings(chatId, {
                        disappearing_minutes: option.value,
                      })
                    }
                    className={`relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-text-secondary outline-none transition-colors hover:bg-ghost-hover hover:text-ghost-fg-hover ${
                      disappearing_minutes === option.value ? 'text-primary' : ''
                    }`}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator className="my-1 h-px bg-border" />
          </>
        }
        trigger={
          <Button intent="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        }
      />
    </div>
  );
};

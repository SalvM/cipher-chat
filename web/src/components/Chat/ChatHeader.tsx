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
import { Timer, MoreVertical, Clock } from 'lucide-react';
import { Button } from '../ui/button';
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
    <div className="h-16 px-6 flex items-center justify-between border-b border-border bg-base backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar
            src={chatAvatar}
            fallback={chatDisplayName?.charAt(0)?.toUpperCase()}
          />
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 ${statusColors[chatStatus]} rounded-full border-2 border-surface`}
          />
        </div>

        <div>
          <h2 className="font-semibold text-text-primary">{chatDisplayName}</h2>
          <p className="text-xs text-text-primary">
            {statusLabels[chatStatus]}
          </p>
        </div>

        {disappearing_minutes ? (
          <div className="flex items-center gap-1 text-xs text-warning bg-elevated px-2 py-1 rounded-full">
            <Timer className="w-3 h-3" />
            {formatTimerLabel(disappearing_minutes)}
          </div>
        ) : null}
      </div>

      <DropdownMenu
        children={
          <>
            <DropdownMenuLabel>Chat Settings</DropdownMenuLabel>

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Clock className="w-4 h-4 mr-2" />
                Disappearing Messages
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {TIMER_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() =>
                      updateChatSettings(chatId, {
                        disappearing_minutes: option.value,
                      })
                    }
                    className={
                      disappearing_minutes === option.value ? 'bg-secondary' : ''
                    }
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {/*
          <DropdownMenuItem
            onClick={() => other?._id && blockUser(other._id)}
            className="text-red-400"
          >
            <Ban className="w-4 h-4 mr-2" />
            Block {chatDisplayName}
          </DropdownMenuItem>
          */}
          </>
        }
        trigger={
          <Button intent="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        }
      ></DropdownMenu>
    </div>
  );
};

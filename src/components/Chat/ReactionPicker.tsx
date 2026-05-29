import React from 'react';
import { motion } from 'framer-motion';
import * as Popover from '@radix-ui/react-popover';
import { EMOJI_OPTIONS } from '@/utils/chatUtils';
import type { Emoji } from '@/types/messageTypes';

interface ReactionPickerProps {
  onSelect: (emoji: Emoji) => void;
  children: React.ReactNode;
}

const ReactionPicker = ({ onSelect, children }: ReactionPickerProps) => {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="z-50" sideOffset={5} align="center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-elevated border border-elevated rounded-xl p-2 flex gap-1 shadow-xl"
          >
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onSelect(emoji)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-text-muted transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
          <Popover.Arrow className="fill-elevated" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

export default ReactionPicker;

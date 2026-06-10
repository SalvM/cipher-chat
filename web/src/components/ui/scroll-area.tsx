import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import { type ReactNode } from 'react';
import { cn } from '@/utils';

export interface ScrollAreaProps {
  children: ReactNode;
  className?: string;
  orientation?: 'vertical' | 'horizontal' | 'both';
}

export function ScrollArea({
  children,
  className,
  orientation = 'vertical',
}: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn('relative overflow-hidden', className)}
    >
      <ScrollAreaPrimitive.Viewport className="size-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>

      {(orientation === 'vertical' || orientation === 'both') && (
        <ScrollAreaPrimitive.Scrollbar
          orientation="vertical"
          className="flex w-1.5 touch-none select-none p-px transition-all hover:w-2"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-primary/30 hover:bg-primary/50 transition-colors" />
        </ScrollAreaPrimitive.Scrollbar>
      )}

      {(orientation === 'horizontal' || orientation === 'both') && (
        <ScrollAreaPrimitive.Scrollbar
          orientation="horizontal"
          className="flex h-1.5 touch-none select-none flex-col p-px transition-all hover:h-2"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-primary/30 hover:bg-primary/50 transition-colors" />
        </ScrollAreaPrimitive.Scrollbar>
      )}

      <ScrollAreaPrimitive.Corner className="bg-elevated" />
    </ScrollAreaPrimitive.Root>
  );
}

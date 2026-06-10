import * as React from 'react';
import { cn } from '@/utils';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center',
        'px-1.5 py-0.5 rounded',
        'font-mono text-[11px] font-medium leading-none',
        'bg-elevated border border-border-strong text-text-secondary',
        'shadow-[0_1px_0_var(--color-border-strong)]',
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}

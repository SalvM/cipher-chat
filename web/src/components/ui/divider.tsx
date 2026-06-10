import * as React from 'react';
import { cn } from '@/utils';

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({
  label,
  orientation = 'horizontal',
  className,
  ...props
}: DividerProps) {
  if (orientation === 'vertical') {
    return (
      <div
        className={cn('w-px self-stretch bg-border', className)}
        role="separator"
        aria-orientation="vertical"
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        className={cn('flex items-center gap-3', className)}
        role="separator"
        {...props}
      >
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-text-muted font-medium">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return (
    <div
      className={cn('h-px w-full bg-border', className)}
      role="separator"
      {...props}
    />
  );
}

import * as React from 'react';
import { Timer, Clock } from 'lucide-react';
import { cn } from '@/utils';

export interface ExpireChipProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  urgent?: boolean;
}

/**
 * Minimal pill chip for disappearing-message timers.
 * Without a label it renders a ghost clock icon.
 * With a label it renders: [timer icon] [label] as a pill.
 * urgent=true (< 60 s left) switches to danger color + pulse.
 */
export function ExpireChip({ label, urgent = false, className, ...props }: ExpireChipProps) {
  if (!label) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center w-7 h-7 rounded-lg',
          'text-ghost-fg transition-colors duration-150',
          className
        )}
        {...props}
      >
        <Clock className="w-3.5 h-3.5" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
        'text-[11px] font-medium font-mono tabular-nums leading-none',
        'border transition-colors duration-150',
        urgent
          ? 'bg-danger-subtle border-danger/40 text-danger animate-pulse'
          : 'bg-warning-subtle border-warning/40 text-warning',
        className
      )}
      {...props}
    >
      <Timer className="w-3 h-3 shrink-0" />
      <span>{label}</span>
    </div>
  );
}

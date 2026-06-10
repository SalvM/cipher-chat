import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils';

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  onDismiss?: () => void;
  dismissLabel?: string;
}

export function Chip({
  children,
  selected = false,
  onDismiss,
  dismissLabel = 'Remove',
  className,
  disabled,
  ...props
}: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
        'border transition-all duration-150 select-none',
        selected
          ? 'bg-primary-subtle border-primary/50 text-primary'
          : 'bg-secondary border-border text-text-secondary hover:border-border-strong hover:text-text-primary',
        disabled && 'pointer-events-none opacity-40',
        className
      )}
    >
      {props.onClick ? (
        <button
          type="button"
          className="focus-visible:outline-none"
          disabled={disabled}
          {...props}
        >
          {children}
        </button>
      ) : (
        <span>{children}</span>
      )}

      {onDismiss && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          disabled={disabled}
          aria-label={dismissLabel}
          className="rounded-full p-0.5 hover:bg-ghost-hover focus-visible:outline-none"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

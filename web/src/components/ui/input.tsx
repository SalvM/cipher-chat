import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

export const inputVariants = cva(
  [
    'w-full rounded-md border bg-elevated/80 px-3 font-sans text-text-primary',
    'placeholder:text-text-muted',
    'transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/60',
    'disabled:pointer-events-none disabled:opacity-40',
  ],
  {
    variants: {
      size: {
        sm: 'h-8  text-sm',
        md: 'h-10 text-sm',
        lg: 'h-12 text-base',
      },
      state: {
        default: 'border-border hover:border-border-strong',
        error:   'border-danger/60 focus-visible:ring-danger/50 focus-visible:border-danger',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  containerClassName?: string | null;
  label?: string;
  error?: string;
  hint?: string;
  ref?: React.RefObject<HTMLInputElement | null>;
}

export function Input({
  className,
  containerClassName,
  size,
  state,
  label,
  error,
  hint,
  ref,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const resolvedState = error ? 'error' : state;

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName ?? '')}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-text-secondary uppercase tracking-wide"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
        ref={ref}
        className={cn(inputVariants({ size, state: resolvedState }), className)}
        aria-invalid={!!error}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        {...props}
      />

      {error && (
        <span id={`${inputId}-error`} className="text-xs text-danger">
          {error}
        </span>
      )}

      {hint && !error && (
        <span id={`${inputId}-hint`} className="text-xs text-text-muted">
          {hint}
        </span>
      )}
    </div>
  );
}

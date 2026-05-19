import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

export const inputVariants = cva(
  [
    'w-full rounded-md border bg-elevated px-3 font-sans text-text-primary',
    'placeholder:text-text-muted',
    'transition-colors duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
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
        error: 'border-danger focus-visible:ring-danger',
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
    },
  }
);

export interface InputProps
  extends
    Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({
  className,
  size,
  state,
  label,
  error,
  hint,
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const resolvedState = error ? 'error' : state;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}

      <input
        id={inputId}
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

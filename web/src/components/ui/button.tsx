import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';
import { Spinner } from './spinner';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-md transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1 focus-visible:ring-offset-base',
    'disabled:pointer-events-none disabled:opacity-40',
    'cursor-pointer select-none',
  ],
  {
    variants: {
      intent: {
        primary:
          'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active hover:shadow-(--glow-primary)',
        secondary:
          'bg-secondary text-secondary-fg border border-border hover:bg-secondary-hover hover:border-border-strong active:bg-secondary-active',
        accent:
          'bg-accent text-accent-fg hover:bg-accent-hover active:bg-accent-active hover:shadow-(--glow-accent)',
        danger:
          'bg-danger text-danger-fg hover:bg-danger-hover active:bg-danger-active',
        ghost:
          'bg-transparent text-ghost-fg hover:bg-ghost-hover hover:text-ghost-fg-hover active:bg-ghost-active',
        link: 'bg-transparent text-link hover:text-link-hover p-0 h-auto',
      },
      size: {
        sm:   'h-8 px-3 text-sm',
        md:   'h-10 px-4 text-sm',
        lg:   'h-12 px-6 text-base',
        icon: 'h-9 w-9 p-0 rounded-md',
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({
  className,
  intent,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ intent, size }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size="sm" /> : children}
    </Comp>
  );
}

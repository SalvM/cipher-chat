import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

export const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium rounded-full select-none',
  {
    variants: {
      intent: {
        default: 'bg-secondary text-text-secondary border border-border',
        primary: 'bg-primary-subtle text-primary border border-primary/30',
        accent:  'bg-accent-subtle text-accent border border-accent/30',
        success: 'bg-success-subtle text-success border border-success/30',
        warning: 'bg-warning-subtle text-warning border border-warning/30',
        danger:  'bg-danger-subtle text-danger border border-danger/30',
        info:    'bg-info-subtle text-info border border-info/30',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px] leading-none',
        md: 'px-2 py-0.5 text-xs',
      },
    },
    defaultVariants: { intent: 'default', size: 'md' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

import * as React from 'react';

export function Badge({ className, intent, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ intent, size }), className)} {...props} />
  );
}

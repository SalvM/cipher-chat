import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

export const skeletonVariants = cva(
  'animate-pulse bg-secondary/60 rounded-md',
  {
    variants: {
      variant: {
        text:   'h-4 w-full rounded-sm',
        avatar: 'rounded-full',
        card:   'rounded-lg',
        line:   'h-3 rounded-sm',
      },
      size: {
        sm: '',
        md: '',
        lg: '',
      },
    },
    compoundVariants: [
      { variant: 'avatar', size: 'sm', className: 'h-8 w-8' },
      { variant: 'avatar', size: 'md', className: 'h-10 w-10' },
      { variant: 'avatar', size: 'lg', className: 'h-12 w-12' },
    ],
    defaultVariants: { variant: 'text', size: 'md' },
  }
);

export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

import * as React from 'react';

export function Skeleton({ className, variant, size, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

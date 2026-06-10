import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

export const spinnerVariants = cva(
  'animate-spin rounded-full border-2 border-border border-t-primary shrink-0',
  {
    variants: {
      size: {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-10 w-10',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

export interface SpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
}

export function Spinner({ size, className }: SpinnerProps) {
  return (
    <div
      className={cn(spinnerVariants({ size }), className)}
      role="status"
      aria-label="Loading"
    />
  );
}

import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-md transition-all duration-150',
    'focus-visible:outline-none focus-visible:ring-primary',
    'disabled:pointer-events-none disabled:opacity-40',
    'cursor-pointer select-none',
  ],
  {
    variants: {
      intent: {
        primary:
          'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active',
        secondary:
          'bg-secondary text-secondary-fg hover:bg-secondary-hover active:bg-secondary-active',
        danger:
          'bg-danger text-danger-fg hover:bg-danger-hover active:bg-danger-active',
        ghost:
          'bg-transparent text-ghost-fg hover:bg-ghost-hover hover:text-ghost-fg-hover active:bg-ghost-active',
        link: 'bg-transparent text-link hover:text-link-hover p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0', // square, icon-only — always pair with aria-label
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Renders the first child element instead of `<button>`.
   * Use when the trigger is semantically a link or another element.
   *
   * @example
   * <Button asChild intent="ghost">
   *   <a href="/channel/general">Go to channel</a>
   * </Button>
   */
  asChild?: boolean;
}

export function Button({
  className,
  intent,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ intent, size }), className)}
      {...props}
    />
  );
}

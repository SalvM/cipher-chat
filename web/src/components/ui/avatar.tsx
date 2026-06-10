import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

export const avatarVariants = cva(
  'relative flex shrink-0 overflow-hidden rounded-full',
  {
    variants: {
      size: {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
        xl: 'h-14 w-14',
      },
    },
    defaultVariants: { size: 'md' },
  }
);

const ringVariants: Record<string, string> = {
  none:    '',
  primary: 'ring-2 ring-offset-2 ring-offset-surface ring-primary',
  accent:  'ring-2 ring-offset-2 ring-offset-surface ring-accent',
  online:  'ring-2 ring-offset-2 ring-offset-surface ring-online',
  dnd:     'ring-2 ring-offset-2 ring-offset-surface ring-dnd',
  idle:    'ring-2 ring-offset-2 ring-offset-surface ring-idle',
};

export interface AvatarProps
  extends AvatarPrimitive.AvatarProps,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  ring?: 'none' | 'primary' | 'accent' | 'online' | 'dnd' | 'idle';
}

export function Avatar({ className, size, src, alt, fallback, ring = 'none' }: AvatarProps) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        avatarVariants({ size }),
        ringVariants[ring] ?? '',
        className
      )}
    >
      <AvatarPrimitive.Image
        className="size-full rounded-[inherit] object-cover"
        src={src}
        alt={alt}
      />
      <AvatarPrimitive.Fallback
        className="flex size-full items-center justify-center bg-secondary text-[13px] font-semibold text-primary"
        delayMs={600}
      >
        {fallback ?? '??'}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

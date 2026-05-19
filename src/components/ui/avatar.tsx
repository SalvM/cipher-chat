import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils';

export const avatarVariants = cva(
  ['relative flex shrink-0 overflow-hidden rounded-full'],
  {
    variants: {
      size: {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-12 w-12',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface AvatarProps
  extends AvatarPrimitive.AvatarProps, VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
}

export function Avatar({ className, size, src, alt, fallback }: AvatarProps) {
  return (
    <div className="flex gap-5">
      <AvatarPrimitive.Root className={cn(avatarVariants({ size }), className)}>
        <AvatarPrimitive.Image
          className="size-full rounded-[inherit] object-cover"
          src={src}
          alt={alt}
        />
        <AvatarPrimitive.Fallback
          className="leading-1 flex size-full items-center justify-center bg-base text-[15px] font-medium text-primary"
          delayMs={600}
        >
          {fallback ?? '??'}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>
    </div>
  );
}

import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/utils';

const itemBase = [
  'relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5',
  'text-sm text-text-secondary outline-none',
  'transition-colors duration-100',
  'hover:bg-ghost-hover hover:text-ghost-fg-hover',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
];

const contentBase = cn(
  'z-50 min-w-44 rounded-xl border border-border-strong',
  'bg-overlay/95 backdrop-blur-xl p-1.5 shadow-xl',
  'animate-in fade-in-0 zoom-in-95',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
);

export function DropdownMenu({
  children,
  trigger,
  align = 'start',
}: {
  children: ReactNode;
  trigger: ReactNode;
  align?: 'start' | 'center' | 'end';
}) {
  return (
    <DropdownPrimitive.Root>
      <DropdownPrimitive.Trigger asChild>{trigger}</DropdownPrimitive.Trigger>

      <DropdownPrimitive.Portal>
        <DropdownPrimitive.Content
          align={align}
          sideOffset={6}
          className={contentBase}
        >
          {children}
        </DropdownPrimitive.Content>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Root>
  );
}

export function DropdownItem({
  children,
  onSelect,
  intent = 'default',
  disabled,
}: {
  children: ReactNode;
  onSelect?: () => void;
  intent?: 'default' | 'danger' | 'accent';
  disabled?: boolean;
}) {
  return (
    <DropdownPrimitive.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        itemBase,
        intent === 'danger' && 'text-danger hover:bg-danger-subtle hover:text-danger',
        intent === 'accent' && 'text-accent hover:bg-accent-subtle hover:text-accent'
      )}
    >
      {children}
    </DropdownPrimitive.Item>
  );
}

export function DropdownCheckItem({
  children,
  checked,
  onCheckedChange,
}: {
  children: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <DropdownPrimitive.CheckboxItem
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(itemBase, 'pl-7')}
    >
      <DropdownPrimitive.ItemIndicator className="absolute left-2">
        <CheckIcon size={14} className="text-primary" />
      </DropdownPrimitive.ItemIndicator>
      {children}
    </DropdownPrimitive.CheckboxItem>
  );
}

export function DropdownSub({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <DropdownPrimitive.Sub>
      <DropdownPrimitive.SubTrigger className={cn(itemBase, 'justify-between')}>
        {label}
        <ChevronRightIcon size={14} className="text-text-muted" />
      </DropdownPrimitive.SubTrigger>

      <DropdownPrimitive.Portal>
        <DropdownPrimitive.SubContent
          sideOffset={8}
          className={contentBase}
        >
          {children}
        </DropdownPrimitive.SubContent>
      </DropdownPrimitive.Portal>
    </DropdownPrimitive.Sub>
  );
}

export function DropdownSeparator() {
  return <DropdownPrimitive.Separator className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <DropdownPrimitive.Label className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
      {children}
    </DropdownPrimitive.Label>
  );
}

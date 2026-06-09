import * as DropdownPrimitive from '@radix-ui/react-dropdown-menu';
import { CheckIcon, ChevronRightIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { cn } from '@/utils';

// ── Subcomponents ──────────────────────────────────────────────

const itemBase = [
  'relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5',
  'text-sm text-text-secondary outline-none',
  'hover:bg-ghost-hover hover:text-ghost-fg-hover',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-40',
];

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
          className={cn(
            'z-50 min-w-45 rounded-lg border border-border bg-overlay p-1 shadow-xl',
            'animate-in fade-in-0 zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95'
          )}
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
  intent?: 'default' | 'danger';
  disabled?: boolean;
}) {
  return (
    <DropdownPrimitive.Item
      onSelect={onSelect}
      disabled={disabled}
      className={cn(
        itemBase,
        intent === 'danger' &&
          'text-danger hover:bg-danger-subtle hover:text-danger'
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
        <CheckIcon size={14} />
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
        <ChevronRightIcon size={14} />
      </DropdownPrimitive.SubTrigger>

      <DropdownPrimitive.Portal>
        <DropdownPrimitive.SubContent
          sideOffset={8}
          className="z-50 min-w-40 rounded-lg border border-border bg-overlay p-1 shadow-xl"
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
    <DropdownPrimitive.Label className="px-2 py-1 text-xs font-medium text-text-muted">
      {children}
    </DropdownPrimitive.Label>
  );
}

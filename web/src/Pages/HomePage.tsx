import { useState } from 'react';
import { PlusIcon, ShieldCheck, Lock, Key, Zap } from 'lucide-react';

// UI primitives
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Chip } from '@/components/ui/chip';
import { Kbd } from '@/components/ui/kbd';
import { Spinner } from '@/components/ui/spinner';
import { Skeleton } from '@/components/ui/skeleton';
import { Divider } from '@/components/ui/divider';
import { ExpireChip } from '@/components/ui/expire-chip';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownSub,
} from '@/components/ui/dropdown-menu';

// Chat components
import MessageBubble from '@/components/Chat/MessageBubble';
import { ChatReplyPreview } from '@/components/Chat/ChatReplyPreview';
import { ChatInput } from '@/components/Chat/ChatInput';
import { ChatUserItem } from '@/components/Chat/ChatUserItem';
import { UserStatusDot } from '@/components/Chat/UserStatusDot';
import TypingIndicator from '@/components/Chat/TypingIndicator';

// Mock data
import {
  jojoMessages,
  mockUsers,
  mockChats,
  DIO_SRC,
  GYRO_SRC,
  JOSEPH_SRC,
  JOTARO_SRC,
  KIRA_SRC,
  GIORNO_SRC,
  BRUNO_SRC,
  OKUYASU_SRC,
} from '@/utils/mockUtils';

import LogoSrc from '@/assets/icons/cipher-logo-primary.svg';
import type { Message } from '@/types/messageTypes';

// ── Section wrapper ───────────────────────────────────────────────
function Section({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-muted">
        {title}
      </h2>
      <div className={wide ? 'w-full' : 'flex flex-wrap items-start gap-3'}>
        {children}
      </div>
    </section>
  );
}

// ── Colour swatch ─────────────────────────────────────────────────
function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={`w-10 h-10 rounded-lg border border-border ${className}`}
      />
      <span className="text-[10px] text-text-muted font-mono">{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function HomePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedChip, setSelectedChip] = useState<string | null>('AES-256');
  const [chips, setChips] = useState([
    'AES-256',
    'RSA-OAEP',
    'ECDSA',
    'PBKDF2',
  ]);
  const messages: Message[] = jojoMessages as Message[];
  const currentUserId = '4'; // Jotaro is "us"

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-14 px-6 py-14">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-primary-subtle border border-primary/20 shadow-(--glow-primary)">
          <img src={LogoSrc} alt="Cipher Chat" className="h-11 w-11" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-text-primary">
            Cipher Chat
          </h1>
          <p className="mt-2 text-text-secondary max-w-md mx-auto">
            End-to-end encrypted. Zero knowledge. Open source.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge intent="primary">
            <ShieldCheck className="w-3 h-3" /> E2E Encrypted
          </Badge>
          <Badge intent="accent">
            <Key className="w-3 h-3" /> RSA-OAEP
          </Badge>
          <Badge intent="success">
            <Lock className="w-3 h-3" /> AES-256-GCM
          </Badge>
          <Badge intent="info">
            <Zap className="w-3 h-3" /> Zero Knowledge
          </Badge>
        </div>
      </div>

      <Divider />

      {/* ── Colour palette ───────────────────────────────────────── */}
      <Section title="Colour Palette">
        <div className="flex flex-wrap gap-6 w-full">
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-text-muted uppercase tracking-widest">
              Backgrounds
            </span>
            <div className="flex gap-2">
              <Swatch label="base" className="bg-base" />
              <Swatch label="surface" className="bg-surface" />
              <Swatch label="elevated" className="bg-elevated" />
              <Swatch label="overlay" className="bg-overlay" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-text-muted uppercase tracking-widest">
              Brand
            </span>
            <div className="flex gap-2">
              <Swatch label="primary" className="bg-primary" />
              <Swatch label="primary-hover" className="bg-primary-hover" />
              <Swatch
                label="primary-subtle"
                className="bg-primary-subtle border-primary/30"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-text-muted uppercase tracking-widest">
              Accent
            </span>
            <div className="flex gap-2">
              <Swatch label="accent" className="bg-accent" />
              <Swatch label="accent-hover" className="bg-accent-hover" />
              <Swatch
                label="accent-subtle"
                className="bg-accent-subtle border-accent/30"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-[10px] text-text-muted uppercase tracking-widest">
              Semantic
            </span>
            <div className="flex gap-2">
              <Swatch label="success" className="bg-success" />
              <Swatch label="warning" className="bg-warning" />
              <Swatch label="danger" className="bg-danger" />
              <Swatch label="info" className="bg-info" />
            </div>
          </div>
        </div>
      </Section>

      {/* ── Typography ───────────────────────────────────────────── */}
      <Section title="Typography" wide>
        <div className="flex flex-col gap-3 w-full">
          <h1 className="text-4xl font-bold">Heading 1 — The Cipher</h1>
          <h2 className="text-3xl font-semibold">Heading 2 — End-to-End</h2>
          <h3 className="text-2xl font-semibold">Heading 3 — Zero Knowledge</h3>
          <h4 className="text-xl font-medium">Heading 4 — RSA-OAEP</h4>
          <p className="text-[1rem] text-text-primary">
            Body — Your messages are encrypted before they leave your device.
            The server never sees plaintext.
          </p>
          <p className="text-sm text-text-secondary">
            Small — AES-256-GCM conversation keys are wrapped with the
            recipient's public RSA key.
          </p>
          <p className="text-xs text-text-muted">
            Muted — Private key stays in your browser, encrypted with your
            password via PBKDF2.
          </p>
          <code className="font-mono text-sm text-primary bg-primary-subtle px-2 py-1 rounded-md">
            const key = await crypto.subtle.generateKey(...)
          </code>
          <div className="flex items-center gap-1.5 text-sm text-text-secondary">
            Press <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> to send a message
          </div>
        </div>
      </Section>

      {/* ── Buttons ──────────────────────────────────────────────── */}
      <Section title="Button">
        <Button intent="primary">Primary</Button>
        <Button intent="secondary">Secondary</Button>
        <Button intent="accent">Accent</Button>
        <Button intent="danger">Danger</Button>
        <Button intent="ghost">Ghost</Button>
        <Button intent="link">Link</Button>
        <Button intent="primary" disabled>
          Disabled
        </Button>
        <Button intent="primary" loading>
          Loading
        </Button>
        <Button intent="primary" size="sm">
          Small
        </Button>
        <Button intent="primary" size="lg">
          Large
        </Button>
        <Button size="icon" intent="ghost" aria-label="Add">
          <PlusIcon size={16} />
        </Button>
      </Section>

      {/* ── Badges ───────────────────────────────────────────────── */}
      <Section title="Badge">
        <Badge intent="default">Default</Badge>
        <Badge intent="primary">Primary</Badge>
        <Badge intent="accent">Accent</Badge>
        <Badge intent="success">Success</Badge>
        <Badge intent="warning">Warning</Badge>
        <Badge intent="danger">Danger</Badge>
        <Badge intent="info">Info</Badge>
        <Badge intent="primary" size="sm">
          Small
        </Badge>
        <Badge intent="accent">
          <Key className="w-2.5 h-2.5" /> Encrypted
        </Badge>
      </Section>

      {/* ── Chips ────────────────────────────────────────────────── */}
      <Section title="Chip">
        {chips.map((chip) => (
          <Chip
            key={chip}
            selected={selectedChip === chip}
            onClick={() => setSelectedChip(chip === selectedChip ? null : chip)}
            onDismiss={() => setChips((c) => c.filter((x) => x !== chip))}
          >
            {chip}
          </Chip>
        ))}
        <Chip disabled>Disabled</Chip>
      </Section>

      {/* ── Expire Chip ──────────────────────────────────────────── */}
      <Section title="Expire Chip">
        <ExpireChip />
        <ExpireChip label="5m" />
        <ExpireChip label="1h" />
        <ExpireChip label="7d" />
        <ExpireChip label="45s" urgent />
        <ExpireChip label="12s" urgent />
      </Section>

      {/* ── Avatar ───────────────────────────────────────────────── */}
      <Section title="Avatar">
        <Avatar src={DIO_SRC} alt="DIO" fallback="DB" size="sm" />
        <Avatar src={GYRO_SRC} alt="Gyro" fallback="GZ" size="md" />
        <Avatar src={JOSEPH_SRC} alt="Joseph" fallback="JJ" size="lg" />
        <Avatar src={JOTARO_SRC} alt="Jotaro" fallback="JK" size="xl" />
        <Avatar src={KIRA_SRC} alt="Kira" fallback="YK" ring="online" />
        <Avatar src={GIORNO_SRC} alt="Giorno" fallback="GG" ring="primary" />
        <Avatar src={BRUNO_SRC} alt="Bruno" fallback="BB" ring="accent" />
        <Avatar src={OKUYASU_SRC} alt="Okuyasu" fallback="ON" ring="dnd" />
        <Avatar fallback="??" size="md" />
      </Section>

      {/* ── Input ────────────────────────────────────────────────── */}
      <Section title="Input" wide>
        <div className="flex w-full flex-col gap-3">
          <Input label="Default" placeholder="Enter text…" />
          <Input
            label="With hint"
            placeholder="username"
            hint="Visible to other users."
          />
          <Input
            label="With error"
            placeholder="Enter email"
            error="Invalid email address."
          />
          <Input label="Disabled" placeholder="Not editable" disabled />
        </div>
      </Section>

      {/* ── Skeleton ─────────────────────────────────────────────── */}
      <Section title="Skeleton" wide>
        <div className="flex flex-col gap-3 w-full">
          <div className="flex items-center gap-3">
            <Skeleton variant="avatar" size="md" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton variant="text" className="w-32" />
              <Skeleton variant="line" className="w-48" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton variant="avatar" size="md" />
            <div className="flex flex-col gap-1.5 flex-1">
              <Skeleton variant="text" className="w-24" />
              <Skeleton variant="line" className="w-64" />
            </div>
          </div>
          <Skeleton variant="card" className="h-24 w-full" />
        </div>
      </Section>

      {/* ── Spinner ──────────────────────────────────────────────── */}
      <Section title="Spinner">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
      </Section>

      {/* ── Divider ──────────────────────────────────────────────── */}
      <Section title="Divider" wide>
        <div className="flex flex-col gap-4 w-full">
          <Divider />
          <Divider label="or continue with" />
          <div className="flex items-center gap-4 h-8">
            <span className="text-sm text-text-secondary">Left</span>
            <Divider orientation="vertical" />
            <span className="text-sm text-text-secondary">Right</span>
          </div>
        </div>
      </Section>

      {/* ── Kbd ──────────────────────────────────────────────────── */}
      <Section title="Keyboard">
        <Kbd>⌘K</Kbd>
        <Kbd>Ctrl</Kbd>
        <Kbd>Enter</Kbd>
        <Kbd>Esc</Kbd>
        <Kbd>⇧</Kbd>
        <span className="text-sm text-text-secondary flex items-center gap-1">
          Send: <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd>
        </span>
      </Section>

      {/* ── Tooltip ──────────────────────────────────────────────── */}
      <Section title="Tooltip">
        <Tooltip content="Encrypt and send" side="top">
          <Button intent="primary" size="sm">
            Top
          </Button>
        </Tooltip>
        <Tooltip content="Public key fingerprint" side="right">
          <Button intent="secondary" size="sm">
            Right
          </Button>
        </Tooltip>
        <Tooltip content="View message details" side="bottom">
          <Button intent="ghost" size="sm">
            Bottom
          </Button>
        </Tooltip>
        <Tooltip content="Copy invite link" side="left">
          <Button intent="accent" size="sm">
            Left
          </Button>
        </Tooltip>
      </Section>

      {/* ── Dropdown ─────────────────────────────────────────────── */}
      <Section title="Dropdown Menu">
        <DropdownMenu
          trigger={<Button intent="secondary">DIO Brando ▾</Button>}
        >
          <DropdownLabel>DIO Brando</DropdownLabel>
          <DropdownSeparator />
          <DropdownItem>Settings</DropdownItem>
          <DropdownSub label="Status">
            <DropdownItem>Online</DropdownItem>
            <DropdownItem>Idle</DropdownItem>
            <DropdownItem>Do not disturb</DropdownItem>
            <DropdownItem>Invisible</DropdownItem>
          </DropdownSub>
          <DropdownItem intent="accent">Encrypt Key</DropdownItem>
          <DropdownSeparator />
          <DropdownItem intent="danger">WRYYY — Log out</DropdownItem>
        </DropdownMenu>
      </Section>

      {/* ── Dialog ───────────────────────────────────────────────── */}
      <Section title="Dialog">
        <Button intent="secondary" onClick={() => setDialogOpen(true)}>
          Open dialog
        </Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="New encrypted cluster"
          description="Choose a name. All messages inside will be E2E encrypted."
          glow
        >
          <div className="flex flex-col gap-4">
            <Input label="Cluster name" placeholder="e.g. Joestar Gang" />
            <div className="flex justify-end gap-2">
              <Button intent="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button intent="primary">Create</Button>
            </div>
          </div>
        </Dialog>
      </Section>

      {/* ── Scroll Area ──────────────────────────────────────────── */}
      <Section title="Scroll Area">
        <ScrollArea className="h-40 w-72 rounded-lg border border-border bg-surface p-3">
          <div className="flex flex-col gap-1">
            {mockUsers.map((u) => (
              <p key={u._id} className="text-sm text-text-secondary">
                {u.display_name} — {u.bio}
              </p>
            ))}
          </div>
        </ScrollArea>
      </Section>

      <Divider label="Chat Components" />

      {/* ── User status states ────────────────────────────────────── */}
      <Section title="User Status Dot">
        {(['online', 'away', 'dnd', 'offline', 'invisible'] as const).map(
          (s) => (
            <div key={s} className="flex flex-col items-center gap-1.5">
              <div className="relative w-10 h-10">
                <Avatar src={DIO_SRC} fallback="D" size="md" />
                <UserStatusDot status={s} />
              </div>
              <span className="text-[10px] text-text-muted">{s}</span>
            </div>
          )
        )}
      </Section>

      {/* ── Chat: User list ──────────────────────────────────────── */}
      <Section title="Chat User Items" wide>
        <div className="w-72 flex flex-col gap-1 bg-surface rounded-xl border border-border p-2">
          {mockChats.map((chat) => (
            <ChatUserItem
              key={chat._id}
              user={chat.otherUser}
              isSelected={chat._id === 'chat_1'}
              onClick={() => {}}
            />
          ))}
        </div>
      </Section>

      {/* ── Chat: Typing indicator ───────────────────────────────── */}
      <Section title="Typing Indicator">
        <TypingIndicator users={['Jotaro Kujo']} />
        <TypingIndicator users={['DIO', 'Gyro Zeppeli']} />
      </Section>

      {/* ── Chat: Message feed ───────────────────────────────────── */}
      <Section title="Message Feed" wide>
        <div className="w-full rounded-xl border border-border bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <div className="relative shrink-0">
              <Avatar src={JOTARO_SRC} fallback="JK" size="sm" />
              <UserStatusDot status="away" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Jotaro Kujo
              </p>
              <p className="text-[11px] text-text-muted">away</p>
            </div>
            <div className="ml-auto">
              <ExpireChip label="5m" />
            </div>
          </div>

          <ScrollArea className="h-96">
            <div className="px-4 py-3">
              {messages.map((message, index) => (
                <MessageBubble
                  key={message._id}
                  message={message}
                  isOwn={message.sender_id === currentUserId}
                  showAvatar={
                    index === 0 ||
                    messages[index - 1].sender_id !== message.sender_id
                  }
                  onReact={() => {}}
                  onExpire={() => {}}
                  currentUserId={currentUserId}
                />
              ))}
              <TypingIndicator users={['DIO Brando', 'Gyro Zeppeli']} />
            </div>
          </ScrollArea>
        </div>
      </Section>

      {/* ── Chat: Input ──────────────────────────────────────────── */}
      <Section title="Chat Input" wide>
        <div className="w-full flex flex-col gap-0 rounded-xl border border-border bg-surface overflow-hidden">
          <ChatReplyPreview
            replyingTo={messages[3]}
            clearReplyingTo={() => {}}
          />
          <ChatInput
            onSendMessage={() => {}}
            disabled={false}
            handleTyping={() => {}}
          />
        </div>
      </Section>
    </main>
  );
}

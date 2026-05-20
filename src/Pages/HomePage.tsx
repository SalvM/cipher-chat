import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { PlusIcon } from 'lucide-react';
import {
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
  DropdownSeparator,
  DropdownSub,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scrollarea';
import { ChatInput } from '@/components/Common/ChatInput';

const DIO_SRC =
  'https://avatars.fastly.steamstatic.com/020e751b71cecafb24d2716b46c5b212930a75ab_full.jpg';
const GYRO_SRC =
  'https://steamuserimages-a.akamaihd.net/ugc/784111175456702019/FA82EEB8C8BEF311A2E8370602C39200ACB2C1F2/?imw=512&&ima=fit&impolicy=Letterbox&imcolor=%23000000&letterbox=false';

// ── Showcase section wrapper ───────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function HomePage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<File | null>(null);

  const { data: repoData } = useQuery({
    queryKey: ['tanstack-query-repo'],
    queryFn: () =>
      fetch('https://api.github.com/repos/TanStack/query').then((res) =>
        res.json()
      ),
  });

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-12 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Cipher Chat
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          UI component showcase
        </p>
      </div>

      {/* ── Button ── */}
      <Section title="Button">
        <Button intent="primary">Primary</Button>
        <Button intent="secondary">Secondary</Button>
        <Button intent="danger">Danger</Button>
        <Button intent="ghost">Ghost</Button>
        <Button intent="link">Link</Button>
        <Button intent="primary" disabled>
          Disabled
        </Button>
        <Button intent="primary" size="sm">
          Small
        </Button>
        <Button intent="primary" size="lg">
          Large
        </Button>
        <Button size="icon" intent="ghost" aria-label="Add">
          <PlusIcon size={18} />
        </Button>
      </Section>

      {/* ── Avatar ── */}
      <Section title="Avatar">
        <Avatar src={DIO_SRC} alt="Dio Brando" fallback="DB" size="sm" />
        <Avatar src={GYRO_SRC} alt="Gyro Zeppeli" fallback="GZ" size="md" />
        <Avatar src={DIO_SRC} alt="Dio Brando" fallback="DB" size="lg" />
        <Avatar fallback="??" size="md" />
      </Section>

      {/* ── Tooltip ── */}
      <Section title="Tooltip">
        <Tooltip content="Add channel" side="top">
          <Button size="icon" intent="ghost" aria-label="Add channel">
            <PlusIcon size={18} />
          </Button>
        </Tooltip>
        <Tooltip content="Tooltip on the right" side="right">
          <Button intent="secondary">Hover me</Button>
        </Tooltip>
      </Section>

      {/* ── Dropdown ── */}
      <Section title="Dropdown Menu">
        <DropdownMenu trigger={<Button intent="primary">User status</Button>}>
          <DropdownLabel>Dio Brando</DropdownLabel>
          <DropdownSeparator />
          <DropdownItem onSelect={() => null}>Settings</DropdownItem>
          <DropdownSub label="Status">
            <DropdownItem>Online</DropdownItem>
            <DropdownItem>Idle</DropdownItem>
            <DropdownItem>Do not disturb</DropdownItem>
          </DropdownSub>
          <DropdownSeparator />
          <DropdownItem intent="danger" onSelect={() => null}>
            Log out
          </DropdownItem>
        </DropdownMenu>
      </Section>

      {/* ── Dialog ── */}
      <Section title="Dialog">
        <Button onClick={() => setDialogOpen(true)}>Open dialog</Button>
        <Dialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="New cluster"
          description="Choose a name and icon for your cluster."
        >
          <div className="flex flex-col gap-4">
            <Input label="Cluster name" placeholder="e.g. Design Team" />
            <div className="flex justify-end gap-2">
              <Button intent="secondary" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button intent="primary">Create</Button>
            </div>
          </div>
        </Dialog>
      </Section>

      {/* ── Input ── */}
      <Section title="Input">
        <div className="flex w-full flex-col gap-3">
          <Input label="Default" placeholder="Enter text..." />
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

      {/* ── Scroll Area ── */}
      <Section title="Scroll Area">
        <ScrollArea className="h-48 w-64 rounded-lg border border-border bg-surface p-3">
          <div className="flex flex-col gap-1">
            {Array.from({ length: 30 }, (_, i) => (
              <p key={i} className="text-sm text-text-secondary">
                Message {i + 1}
              </p>
            ))}
          </div>
        </ScrollArea>
      </Section>

      {/*  ── ChatInput ──  */}
      <Section title="ChatInput">
        <div className="flex w-full flex-col gap-3">
          <ChatInput
            handleSendMessage={(message, file) => {
              console.log(message);
              setFilePreview(file);
            }}
            isUploading={false}
            uploadDisabled={false}
            handleTyping={() => null}
          />
        </div>
      </Section>

      {/* ── React Query demo ── */}
      {repoData && (
        <Section title="React Query — TanStack/query repo">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-text-primary">
              {repoData.name}
            </p>
            <p className="text-sm text-text-secondary">
              {repoData.description}
            </p>
            <div className="mt-2 flex gap-4 text-sm text-text-muted">
              <span>👀 {repoData.subscribers_count}</span>
              <span>✨ {repoData.stargazers_count}</span>
              <span>🍴 {repoData.forks_count}</span>
            </div>
          </div>
        </Section>
      )}
    </main>
  );
}

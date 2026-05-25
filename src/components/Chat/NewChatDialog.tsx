import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import api from '@/services/Api';
import type { User } from '@/types/userTypes';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '../ui/avatar';

interface NewChatDialogProps {
  dialogOpen: boolean;
  closeDialog: () => void;
  onCreated: (chatId: string) => void;
}

export const NewChatDialog = ({
  dialogOpen,
  closeDialog,
  onCreated,
}: NewChatDialogProps) => {
  const [query, setQuery] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [searchResults, setSearchResult] = useState<User[] | null>();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestion: User | null = useMemo(
    () => searchResults?.[0] ?? null,
    [searchResults]
  );

  const searchUsers = async (query: string) => {
    if (isLoading) return;
    if (!query) {
      setSearchResult([]);
    }
    query = query.trim();
    if (!query || query.length < 2) {
      setSearchResult([]);
    }

    try {
      setLoading(true);
      const responseData = await api.get<{ users: User[] }>(
        `/users/search?q=${encodeURIComponent(query)}`
      );
      setSearchResult(responseData?.users ?? []);
    } catch (error) {
      setSearchResult([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!suggestion) return;
    onCreated(suggestion.id);
    closeDialog();
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      searchUsers(query);
    }, 400);
  }, [query]);

  return (
    <Dialog
      open={dialogOpen}
      title="New Chat"
      description="Search for a user to start a conversation."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-row align-center gap-2">
          <span className="font-sm font-bold font-mono text-text-secondary">
            @
          </span>
          <Input
            placeholder="e.g. @ayeyebrazorf"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && closeDialog()}
          />
        </div>
        {isLoading && (
          <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
        )}

        {suggestion && (
          <div className="flex items-center gap-4 p-4 bg-overlay">
            <Avatar
              src={suggestion.avatar}
              alt={suggestion.avatar}
              fallback={suggestion.username[0].toUpperCase()}
            />
            <div className="flex flex-1 flex-col gap-0">
              {suggestion.display_name && (
                <span className="font-md text-text-primary">
                  {suggestion.display_name}
                </span>
              )}
              {suggestion.username && (
                <span className="font-sm text-text-secondary">
                  @{suggestion.username}
                </span>
              )}
            </div>
            <span className="dialog-user-check">✓</span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button intent="secondary" onClick={closeDialog}>
            Cancel
          </Button>
          <Button
            intent="primary"
            disabled={searchResults?.length === 0}
            onClick={handleStart}
          >
            Create
          </Button>
        </div>
      </div>
    </Dialog>
  );
};

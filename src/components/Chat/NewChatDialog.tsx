import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import api from '@/services/Api';
import type { User } from '@/types/userTypes';
import { useEffect, useMemo, useRef, useState } from 'react';

interface NewChatDialogProps {
  dialogOpen: boolean;
  setDialogOpen: (value: boolean) => void;
  onCreated: (chatId: string) => void;
}

export const NewChatDialog = ({
  dialogOpen,
  setDialogOpen,
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
    if (!query) {
      setSearchResult([]);
    }
    query = query.trim();
    if (!query || query.length < 2) {
      setSearchResult([]);
    }

    try {
      setLoading(true);
      const users = await api.get<User[]>(
        `users/search?q=${encodeURIComponent(query)}`
      );
      setSearchResult(users);
    } catch (error) {
      setSearchResult([]);
    } finally {
      setLoading(false);
    }
  };

  const closeDialog = () => setDialogOpen(false);
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
  }, [query, searchUsers]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={setDialogOpen}
      title="New Chat"
      description="Search for a user to start a conversation."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-row align-center gap-2">
          <span className="dialog-search-icon">@</span>
          <Input
            placeholder="e.g. @ayeyebrazorf"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && closeDialog()}
          />
        </div>
        {isLoading && <span className="dialog-spinner" />}

        {suggestion && (
          <div className="dialog-suggestion">
            <div className="dialog-user-avatar">
              {suggestion.avatar ? (
                <img src={suggestion.avatar} alt="" />
              ) : (
                <span>{suggestion.username[0].toUpperCase()}</span>
              )}
            </div>
            <div className="dialog-user-info">
              {suggestion.display_name && (
                <span className="dialog-user-name">
                  {suggestion.display_name}
                </span>
              )}
              {suggestion.username && (
                <span className="dialog-user-bio">@{suggestion.username}</span>
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

      <style>
        {`
        .dialog-spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(99,179,237,0.2);
          border-top-color: #63b3ed;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }`}
      </style>
    </Dialog>
  );
};

import { useState } from 'react';
import { useCryptoStore } from '@/stores/cryptoStore';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Prompts user to unlock their encrypted private key on new browser/tab.
 *
 * Scenario: User logs in on Browser A (key unlocked), then opens app on Browser B.
 * Browser B has valid JWT but sessionStorage is empty (new context).
 * This component asks user to re-enter password to decrypt privateKeyBundle from localStorage.
 *
 * Why? Private key never stored in plain form. Password is required to decrypt it.
 * This prevents leaking keys if device is stolen (plain key never on disk).
 */
export function UnlockKeyPrompt() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { unlockWithPassword } = useCryptoStore();
  const { logout, user } = useAuthStore();

  const handleUnlock = async () => {
    if (!password) return;
    setLoading(true);
    setError('');
    const ok = await unlockWithPassword(password, user?._id ?? '');
    setLoading(false);
    if (!ok) setError('Incorrect password');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-border bg-elevated p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-text-primary">
            Unlock encryption keys
          </h1>
          <p className="text-sm text-text-secondary">
            Enter your password to decrypt your private key for this session.
          </p>
        </div>

        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          error={error}
          autoFocus
        />

        <Button
          intent="primary"
          disabled={loading || !password}
          onClick={handleUnlock}
        >
          {loading ? 'Unlocking…' : 'Unlock'}
        </Button>

        <Button intent="ghost" size="sm" onClick={logout}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

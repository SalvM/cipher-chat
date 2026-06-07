import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { useCryptoStore } from '@/stores/cryptoStore';
import { UnlockKeyPrompt } from '@/components/Auth/UnlockKeyPrompt';

/**
 * Protects routes: requires both auth token AND decrypted private key.
 *
 * Gate 1: !isAuthenticated → redirect to /login
 * Gate 2: !isUnlocked && hasBundle → show UnlockKeyPrompt (re-unlock key on new browser/tab)
 *
 * Once both gates pass, user can access /chat and decrypt messages.
 */
export function AuthGuard() {
  const { isAuthenticated } = useAuthStore();
  const { isUnlocked } = useCryptoStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const hasBundle = !!localStorage.getItem('privateKeyBundle');
  if (!isUnlocked && hasBundle) return <UnlockKeyPrompt />;

  return <Outlet />;
}

import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/stores/authStore';
import { useCryptoStore } from '@/stores/cryptoStore';
import { UnlockKeyPrompt } from '@/components/Auth/UnlockKeyPrompt';
import { LoadingPage } from '@/components/Common/LoadingPage';

/**
 * Protects routes: requires both auth token AND decrypted private key.
 *
 * Gate 1: !isAuthenticated → redirect to /login
 * Gate 2: isInitializing → show spinner (wait for fetchCurrentUser to restore key from sessionStorage)
 * Gate 3: !isUnlocked && hasBundle → show UnlockKeyPrompt (new browser/tab or failed session restore)
 *
 * Once all gates pass, user can access /chat and decrypt messages.
 */
export function AuthGuard() {
  const { isAuthenticated, isInitializing } = useAuthStore();
  const { isUnlocked } = useCryptoStore();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (isInitializing) return <LoadingPage />;

  const hasBundle = !!localStorage.getItem('privateKeyBundle');
  if (!isUnlocked && hasBundle) return <UnlockKeyPrompt />;

  return <Outlet />;
}

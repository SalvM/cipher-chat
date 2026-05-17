import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '@/store/authStore';

export function AuthGuard() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <Outlet />;
}

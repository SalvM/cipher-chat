import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

export type AuthMode = 'login' | 'register' | 'recover';

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  displayName: string;
}

export function useAuth() {
  const { login, register, isAuthenticated } = useAuthStore();

  const handleLogin = async (data: LoginData): Promise<boolean> => {
    const result = await login(data.username, data.password);
    if (result.success) {
      toast.success('Welcome back!');
      return true;
    } else {
      toast.error(result.error || 'Login failed');
      return false;
    }
  };

  const handleRegister = async (data: RegisterData): Promise<boolean> => {
    const result = await register(
      data.username,
      data.password,
      data.displayName
    );
    if (result.success) {
      toast.success('Account created!');
      return true;
    } else {
      toast.error(result.error || 'Registration failed');
      return false;
    }
  };

  return {
    isAuthenticated,
    handleLogin,
    handleRegister,
  };
}

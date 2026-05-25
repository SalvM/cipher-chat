import React, {
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
// import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog } from '../ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

type AuthMode = 'login' | 'register' | 'recover';

interface AuthModalProps {
  dialogOpen: boolean;
  onOpenChange?: Dispatch<SetStateAction<boolean>>;
  closeDialog: () => void;
}
const AuthModal = ({
  dialogOpen,
  onOpenChange,
  closeDialog,
}: AuthModalProps) => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const { register, login } = useAuthStore();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
    recoveryPhrase: '',
    newPassword: '',
  });

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (authMode === 'login') {
      const result = await login(formData.username, formData.password);
      if (result.success) {
        toast.success('Welcome back!');
        closeDialog();
        navigate('/chat');
      } else {
        toast.error(result.error || 'Login failed');
      }
    } else if (authMode === 'register') {
      const result = await register(
        formData.username,
        formData.password,
        formData.displayName
      );
    }
    setIsLoading(false);
  };

  const dialogText = useMemo(() => {
    switch (authMode) {
      case 'login':
        return {
          title: 'Welcome Back',
          description: 'Sign in to continue to Cipher Chat',
        };
      case 'register':
        return {
          title: 'Create Account',
          description: 'Start your private messaging journey',
        };
      default:
        return { title: '', description: '' };
    }
  }, [authMode]);

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={onOpenChange}
      title={dialogText.title}
      description={dialogText.description}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Username
          </label>
          <Input
            type="text"
            value={formData.username}
            onChange={(e) =>
              setFormData({ ...formData, username: e.target.value })
            }
            placeholder="Enter your username"
            required
            data-testid="username-input"
          />
        </div>

        {authMode === 'register' && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Display Name
            </label>
            <Input
              type="text"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              placeholder="How others will see you"
              data-testid="display-name-input"
            />
          </div>
        )}

        {(authMode === 'login' || authMode === 'register') && (
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={
                  authMode === 'register'
                    ? 'Min 8 characters'
                    : 'Enter your password'
                }
                required
                minLength={authMode === 'register' ? 8 : undefined}
                data-testid="password-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          data-testid="auth-submit-btn"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-border border-t-white rounded-full animate-spin" />
          ) : (
            <>
              {authMode === 'login' && 'Sign In'}
              {authMode === 'register' && 'Create Account'}
            </>
          )}
        </Button>
      </form>

      <div className="mt-6 text-center">
        {authMode === 'login' && (
          <>
            <p className="text-text-secondary text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => setAuthMode('register')}
                className="text-link hover:text-link-hover font-medium transition-colors"
                data-testid="switch-to-register-btn"
              >
                Sign up
              </button>
            </p>
            <button
              disabled
              onClick={() => setAuthMode('recover')}
              className="text-link hover:text-link-hover font-medium transition-colors"
              data-testid="switch-to-recover-btn"
            >
              Forgot password?
            </button>
          </>
        )}
        {authMode === 'register' && (
          <p className="text-text-secondary text-sm">
            Already have an account?{' '}
            <button
              onClick={() => setAuthMode('login')}
              className="text-link hover:text-link-hover font-medium transition-colors"
              data-testid="switch-to-login-btn"
            >
              Sign in
            </button>
          </p>
        )}
        {authMode === 'recover' && (
          <button
            onClick={() => setAuthMode('login')}
            className="text-link hover:text-link-hover font-medium transition-colors"
            data-testid="back-to-login-btn"
          >
            Back to sign in
          </button>
        )}
      </div>
    </Dialog>
  );
};

export default AuthModal;

import { useMemo, useState, type SubmitEventHandler } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Spinner } from '../ui/spinner';
import { Navigate } from 'react-router';
import { useAuth, type AuthMode } from '@/hooks/useAuth';
import LogoSrc from '@/assets/icons/cipher-logo-primary.svg';

const AuthForm = () => {
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    displayName: '',
  });

  const { isAuthenticated, handleLogin, handleRegister } = useAuth();

  const formText = useMemo(() => {
    switch (authMode) {
      case 'login':
        return {
          title: 'Welcome back',
          description: 'Sign in to continue to Cipher Chat',
        };
      case 'register':
        return {
          title: 'Create account',
          description: 'Start your private messaging journey',
        };
      default:
        return { title: '', description: '' };
    }
  }, [authMode]);

  if (isAuthenticated) {
    return <Navigate replace to="/chat" />;
  }

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (authMode === 'login') {
      await handleLogin({
        username: formData.username,
        password: formData.password,
      });
    } else if (authMode === 'register') {
      const success = await handleRegister({
        username: formData.username,
        password: formData.password,
        displayName: formData.displayName,
      });
      if (success) setAuthMode('login');
    }

    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-surface/80 backdrop-blur-xl shadow-xl shadow-(--glow-primary)/5">
      {/* Header */}
      <div className="flex flex-col items-center gap-5 px-8 pt-10">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-subtle border border-primary/20 shadow-(--glow-primary)">
          <img src={LogoSrc} alt="Cipher Chat" className="h-9 w-9" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text-primary">
            {formText.title}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {formText.description}
          </p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-8 py-6"
      >
        <Input
          label="Username"
          type="text"
          value={formData.username}
          onChange={(e) =>
            setFormData({ ...formData, username: e.target.value })
          }
          placeholder="Enter your username"
          required
          data-testid="username-input"
          disabled={isLoading}
        />

        {authMode === 'register' && (
          <Input
            label="Display Name"
            type="text"
            value={formData.displayName}
            onChange={(e) =>
              setFormData({ ...formData, displayName: e.target.value })
            }
            placeholder="How others will see you"
            data-testid="display-name-input"
            disabled={isLoading}
          />
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">
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
                authMode === 'register' ? 'Min 8 characters' : 'Enter your password'
              }
              required
              minLength={authMode === 'register' ? 8 : undefined}
              data-testid="password-input"
              disabled={isLoading}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-secondary disabled:opacity-50"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full mt-1"
          disabled={isLoading}
          loading={isLoading}
          data-testid="auth-submit-btn"
        >
          {!isLoading && (
            <>
              {authMode === 'login' && 'Sign In'}
              {authMode === 'register' && 'Create Account'}
            </>
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="flex flex-col gap-2 border-t border-border px-8 py-5 text-center">
        {authMode === 'login' && (
          <>
            <p className="text-sm text-text-secondary">
              No account?{' '}
              <button
                onClick={() => setAuthMode('register')}
                disabled={isLoading}
                className="font-medium text-link transition-colors hover:text-link-hover disabled:opacity-50"
                data-testid="switch-to-register-btn"
              >
                Sign up
              </button>
            </p>
            <button
              disabled
              className="text-xs text-text-muted transition-colors disabled:opacity-40"
              data-testid="switch-to-recover-btn"
            >
              Forgot password?
            </button>
          </>
        )}
        {authMode === 'register' && (
          <p className="text-sm text-text-secondary">
            Already have an account?{' '}
            <button
              onClick={() => setAuthMode('login')}
              disabled={isLoading}
              className="font-medium text-link transition-colors hover:text-link-hover disabled:opacity-50"
              data-testid="switch-to-login-btn"
            >
              Sign in
            </button>
          </p>
        )}
        {/* E2E security note */}
        <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-text-muted">
          <ShieldCheck className="w-3 h-3 text-primary" />
          <span>End-to-end encrypted · Zero knowledge</span>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;

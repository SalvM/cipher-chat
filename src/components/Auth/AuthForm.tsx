import { useMemo, useState, type SubmitEventHandler } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Navigate } from 'react-router';
import { useAuth, type AuthMode } from '@/hooks/useAuth';

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
                return { title: 'Welcome Back', description: 'Sign in to continue to Cipher Chat' };
            case 'register':
                return { title: 'Create Account', description: 'Start your private messaging journey' };
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
            await handleLogin({ username: formData.username, password: formData.password });
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
        <div className="w-full max-w-sm rounded-lg bg-surface shadow-lg">
            {/* Header */}
            <div className="space-y-4 px-6 pt-8 sm:px-8 sm:pt-10">
                <div className="flex justify-center">
                    <img
                        src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                        alt="Your Company"
                        className="h-10 w-auto"
                    />
                </div>
                <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                        {formText.title}
                    </h2>
                    <p className="text-sm text-text-secondary sm:text-base">
                        {formText.description}
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6 sm:px-8 sm:py-8">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">Username</label>
                    <Input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Enter your username"
                        required
                        data-testid="username-input"
                        disabled={isLoading}
                    />
                </div>

                {authMode === 'register' && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">Display Name</label>
                        <Input
                            type="text"
                            value={formData.displayName}
                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                            placeholder="How others will see you"
                            data-testid="display-name-input"
                            disabled={isLoading}
                        />
                    </div>
                )}

                {(authMode === 'login' || authMode === 'register') && (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">Password</label>
                        <div className="relative">
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                placeholder={authMode === 'register' ? 'Min 8 characters' : 'Enter your password'}
                                required
                                minLength={authMode === 'register' ? 8 : undefined}
                                data-testid="password-input"
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                )}

                <Button type="submit" className="w-full" disabled={isLoading} data-testid="auth-submit-btn">
                    {isLoading ? (
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-white" />
                    ) : (
                        <>
                            {authMode === 'login' && 'Sign In'}
                            {authMode === 'register' && 'Create Account'}
                        </>
                    )}
                </Button>
            </form>

            {/* Footer */}
            <div className="space-y-3 border-t border-border px-6 py-6 text-center sm:px-8 sm:py-8">
                {authMode === 'login' && (
                    <>
                        <p className="text-sm text-text-secondary">
                            Don't have an account?{' '}
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
                            onClick={() => setAuthMode('recover')}
                            className="block w-full text-sm font-medium text-link transition-colors hover:text-link-hover disabled:opacity-50"
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
                {authMode === 'recover' && (
                    <button
                        onClick={() => setAuthMode('login')}
                        disabled={isLoading}
                        className="block w-full text-sm font-medium text-link transition-colors hover:text-link-hover disabled:opacity-50"
                        data-testid="back-to-login-btn"
                    >
                        Back to sign in
                    </button>
                )}
            </div>
        </div>
    );
};

export default AuthForm;
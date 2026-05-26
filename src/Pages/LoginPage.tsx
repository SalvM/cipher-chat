import AuthForm from '@/components/Auth/AuthForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4 py-12 sm:px-6 lg:px-8">
      <AuthForm />
    </div>
  );
}

import AuthForm from '@/components/Auth/AuthForm';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-base px-4 py-12">
      {/* Radial glow behind the card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, #2dd4bf0a 0%, transparent 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 40% 40% at 50% 80%, #818cf806 0%, transparent 60%)',
        }}
      />
      <AuthForm />
    </div>
  );
}

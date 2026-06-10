import { Spinner } from '@/components/ui/spinner';
import LogoSrc from '@/assets/icons/cipher-logo-primary.svg';

export function LoadingPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <img src={LogoSrc} alt="Cipher Chat" className="h-10 w-10 opacity-60" />
      <Spinner size="md" />
    </div>
  );
}

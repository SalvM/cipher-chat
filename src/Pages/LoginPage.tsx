import AuthModal from '@/components/Auth/AuthModal';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/section';
import { useState } from 'react';

export default function LoginPage() {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <p>Lorem ipsum dolor sit amet, consectetur adip.</p>
      <Section title="NewChatDialog">
        <Button onClick={() => setAuthDialogOpen(true)}>Open dialog</Button>
        <AuthModal
          dialogOpen={authDialogOpen}
          onOpenChange={setAuthDialogOpen}
          closeDialog={() => setAuthDialogOpen(false)}
        />
      </Section>
    </div>
  );
}

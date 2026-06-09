import { create } from 'zustand';
import { CryptoService } from '@/services/CryptoService';

interface CryptoState {
  privateKey: CryptoKey | null;
  isUnlocked: boolean;
  setPrivateKey: (key: CryptoKey) => void;
  clearPrivateKey: () => void;
  unlockWithPassword: (password: string) => Promise<boolean>;
}

/**
 * Stores user's RSA private key (in-memory, ephemeral).
 *
 * Flow:
 * - Login/Register: private key encrypted with password, stored in localStorage as `privateKeyBundle`
 * - SessionStorage: PKCS8 bytes cached during login for fast recovery on page refresh (survives F5)
 * - New browser/tab: sessionStorage cleared → `unlockWithPassword()` prompts user to re-enter password
 *
 * Why encrypted? Private key never leaves client unencrypted. Password needed to decrypt on new session.
 * Why ephemeral? Cleared on logout; never persisted in plain form.
 */
export const useCryptoStore = create<CryptoState>((set) => ({
  privateKey: null,
  isUnlocked: false,
  setPrivateKey: (key) => set({ privateKey: key, isUnlocked: true }),
  clearPrivateKey: () => set({ privateKey: null, isUnlocked: false }),

  unlockWithPassword: async (password: string) => {
    const bundle = localStorage.getItem('privateKeyBundle');
    if (!bundle) return false;
    try {
      const pk = await CryptoService.decryptPrivateKey(bundle, password);
      set({ privateKey: pk, isUnlocked: true });
      return true;
    } catch {
      return false;
    }
  },
}));

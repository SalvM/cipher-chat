import api from '@/services/Api';
import type { AuthResponse, LoginResponse } from '@/types/authTypes';
import type { User } from '@/types/userTypes';
import type { Status } from '@/types/utilityTypes';
import { parseUserFromAPI } from '@/utils/userUtils';
import { create } from 'zustand';
import { CryptoService } from '@/services/CryptoService';
import { useCryptoStore } from '@/stores/cryptoStore';
import { keyService } from '@/services/KeyService';

export interface AuthStoreState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
}

export interface AuthStoreActions {
  login: (username: string, password: string) => Promise<AuthResponse>;
  logout: () => void;
  updateStatus: (status: Status) => Promise<void>;
  register: (
    username: string,
    password: string,
    displayName: string
  ) => Promise<AuthResponse>;
  initialize: () => void;
  fetchCurrentUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthStoreState & AuthStoreActions>(
  (set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    isInitializing: true,

    initialize: () => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        set({
          token,
          isAuthenticated: !!token,
          isLoading: false,
        });
      }
    },

    setUser: (user) => set({ user }),

    setToken: (token) => {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
      set({ token });
    },

    register: async (username, password, displayName) => {
      try {
        const responseData = await api.post<{
          token: string;
          user: User;
        }>('/auth/register', {
          body: {
            username,
            password,
            display_name: displayName,
          },
        });
        if (!responseData) throw responseData;
        const { token, user } = responseData;
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true, isLoading: false });

        try {
          const kp = await CryptoService.generateIdentityKeypair();
          const pub = await CryptoService.exportPublicKey(kp.publicKey);
          await api.put('/keys/identity', { body: { public_key: pub } });
          const bundle = await CryptoService.encryptPrivateKey(
            kp.privateKey,
            password
          );
          localStorage.setItem(`privateKeyBundle_${user._id}`, bundle);
          useCryptoStore.getState().setPrivateKey(kp.privateKey);
        } catch (e) {
          console.error('[register] crypto setup failed', e);
        }

        return { success: true };
      } catch (error: any) {
        const message = error.data?.detail ?? 'Registration failed';
        return { success: false, error: message };
      }
    },

    login: async (username, password) => {
      try {
        const responseData = await api.post<LoginResponse>('/auth/login', {
          body: {
            username,
            password,
          },
        });
        if (!responseData) throw responseData;
        const { token, user } = responseData;
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          const authUser = parseUserFromAPI(user);
          localStorage.setItem('user', JSON.stringify(authUser));
          set({ token, user: authUser, isLoading: false });

          const bundleKey = `privateKeyBundle_${authUser._id}`;
          const bundle = localStorage.getItem(bundleKey);
          if (bundle) {
            try {
              const pk = await CryptoService.decryptPrivateKey(
                bundle,
                password
              );
              useCryptoStore.getState().setPrivateKey(pk);
            } catch {
              console.error(
                '[login] bundle decryption failed — key remains locked'
              );
            }
          } else {
            // No bundle for this user on this device — generate fresh keypair
            try {
              const kp = await CryptoService.generateIdentityKeypair();
              const pub = await CryptoService.exportPublicKey(kp.publicKey);
              await api.put('/keys/identity', { body: { public_key: pub } });
              const nb = await CryptoService.encryptPrivateKey(
                kp.privateKey,
                password
              );
              localStorage.setItem(bundleKey, nb);
              useCryptoStore.getState().setPrivateKey(kp.privateKey);
            } catch (e) {
              console.error('[login] keypair generation failed', e);
            }
          }

          set({ isAuthenticated: true });
        }
        return { success: true };
      } catch (error: any) {
        const message = error.data?.detail ?? 'Login failed';
        return { success: false, error: message };
      }
    },

    fetchCurrentUser: async () => {
      const token = get().token;
      if (!token) {
        set({ isLoading: false, isInitializing: false });
        return;
      }

      try {
        const user = await api.get<User>('/auth/me');
        set({ user: user, isLoading: false });
        if (!useCryptoStore.getState().isUnlocked) {
          const pk = await CryptoService.importPrivateKeyFromSession();
          if (pk) useCryptoStore.getState().setPrivateKey(pk);
        }
      } catch (error) {
        localStorage.removeItem('token');
        set({ token: null, user: null, isLoading: false });
      } finally {
        set({ isInitializing: false });
      }
    },

    updateProfile: async (profile: any) => {
      try {
        const userProfile = await api.put<User>('/auth/profile', profile);
        set({ user: userProfile });
        return { success: true };
      } catch (error: any) {
        return {
          success: false,
          error: error.data?.detail ?? 'Failed to update profile',
        };
      }
    },

    updateStatus: async (status: Status) => {
      try {
        await api.put('/auth/status', { body: status });
        set((state) => ({
          user: state.user ? { ...state.user, status } : null,
        }));
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      CryptoService.clearSessionKey();
      useCryptoStore.getState().clearPrivateKey();
      keyService.clearAll();
      set({ token: null, isAuthenticated: false, user: null });
    },
  })
);

import api from '@/services/Api';
import type { AuthResponse, LoginResponse } from '@/types/authTypes';
import type { User } from '@/types/userTypes';
import type { Status } from '@/types/utilityTypes';
import { parseUserFromAPI } from '@/utils/userUtils';
import { create } from 'zustand';

export interface AuthStoreState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
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
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthStoreState & AuthStoreActions>(
  (set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,

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
        set({ token, user, isLoading: false });
        return { success: true };
      } catch (error: any) {
        const message = error.response?.data?.detail || 'Registration failed';
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
          set({
            token,
            user: parseUserFromAPI(user),
            isLoading: false,
            isAuthenticated: true,
          });
        }
        return { success: true };
      } catch (error: any) {
        const message = error.response?.data?.detail || 'Login failed';
        return { success: false, error: message };
      }
    },

    fetchCurrentUser: async () => {
      const token = get().token;
      if (!token) {
        set({ isLoading: false });
        return;
      }

      try {
        const user = await api.get<User>('/auth/me');
        set({ user: user, isLoading: false });
      } catch (error) {
        localStorage.removeItem('token');
        set({ token: null, user: null, isLoading: false });
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
          error: error.response?.data?.detail || 'Failed to update profile',
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
      set({ token: null, user: null });
    },
  })
);

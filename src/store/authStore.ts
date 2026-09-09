import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '@/types';
import { authService } from '@/services/authService';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      login: async (email, password, remember = true) => {
        set({ loading: true });
        try {
          const session = await authService.login({ email, password, remember });
          set({ user: session.user, token: session.token, isAuthenticated: true, loading: false });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },
      logout: async () => {
        set({ user: null, token: null, isAuthenticated: false });
        try {
          await authService.logout();
        } catch {
          // best-effort server token revoke
        }
      },
      setUser: (user) => set({ user }),
    }),
    {
      name: 'wablast:auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
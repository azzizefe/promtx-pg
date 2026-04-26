import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AuthProvider = 'google' | 'apple' | 'microsoft';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  linkedProviders: AuthProvider[];
  impersonateMode: boolean;
  impersonatorId: string | null;
  credits: number;
  unreadCount: number;
  notifications: Notification[];

  // Actions
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  linkProvider: (provider: AuthProvider) => void;
  unlinkProvider: (provider: AuthProvider) => void;
  setCredits: (credits: number) => void;
  addNotification: (notification: Notification) => void;
  markNotificationsAsRead: () => void;
  setImpersonateMode: (active: boolean, originalUserId?: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      linkedProviders: [],
      impersonateMode: false,
      impersonatorId: null,
      credits: 0,
      unreadCount: 0,
      notifications: [],

      login: (user, token, refreshToken) =>
        set({ user, token, refreshToken, isAuthenticated: true }),
      
      logout: () =>
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          linkedProviders: [],
          impersonateMode: false,
          impersonatorId: null,
        }),

      linkProvider: (provider) =>
        set((state) => ({
          linkedProviders: state.linkedProviders.includes(provider)
            ? state.linkedProviders
            : [...state.linkedProviders, provider],
        })),

      unlinkProvider: (provider) =>
        set((state) => ({
          linkedProviders: state.linkedProviders.filter((p) => p !== provider),
        })),

      setCredits: (credits) => set({ credits }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        })),

      markNotificationsAsRead: () =>
        set((state) => ({
          unreadCount: 0,
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      setImpersonateMode: (active, originalUserId) =>
        set({
          impersonateMode: active,
          impersonatorId: originalUserId || null,
        }),
    }),
    {
      name: 'promtx-auth-storage',
      // only persist specific fields
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        linkedProviders: state.linkedProviders,
      }),
    }
  )
);

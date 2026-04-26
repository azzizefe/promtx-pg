import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';

// IndexedDB storage provider for Zustand
const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

export type AuthProvider = 'google' | 'apple' | 'microsoft';

export interface User {
  id: string; // UUID format
  email: string;
  displayName: string;
  role: string;
  avatarUrl?: string;
}

export interface Notification {
  id: string; // UUID format
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
      storage: createJSONStorage(() => idbStorage),
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

// Studio State Types Update
export type StudioType = 'image' | 'video' | 'cinema' | 'audio' | 'character' | 'fashion' | 'marketing' | 'edit';

export interface PromptHistoryItem {
  id: string; // UUID format
  promptText: string;
  parameters: any;
  studioType: StudioType;
  modelId: string;
  createdAt: string; // ISO 8601
}

export interface PromptPreset {
  id: string; // UUID format
  name: string;
  description: string;
  templateText: string;
  studioType: StudioType;
  tags: string[];
}

interface StudioState {
  currentStudio: StudioType;
  history: PromptHistoryItem[];
  presets: PromptPreset[];
  setCurrentStudio: (studio: StudioType) => void;
  addHistoryItem: (item: PromptHistoryItem) => void;
  setPresets: (presets: PromptPreset[]) => void;
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      currentStudio: 'image',
      history: [],
      presets: [],
      setCurrentStudio: (studio) => set({ currentStudio: studio }),
      addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history] })),
      setPresets: (presets) => set({ presets }),
    }),
    {
      name: 'promtx-studio-storage',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        currentStudio: state.currentStudio,
      }),
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { api } from './api';
import { connectSocket, disconnectSocket, getSocket } from './socket';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, token: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<{ user: User }>('/api/auth/login', {
            username,
            password,
          });
          set({ user: response.user, isLoading: false });
          connectSocket();
          const socket = getSocket();
          socket.emit('user:identify', {
            id: response.user.id,
            username: response.user.username,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (username: string, password: string, token: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post<{ user: User }>('/api/auth/register', {
            username,
            password,
            token,
          });
          set({ user: response.user, isLoading: false });
          connectSocket();
          const socket = getSocket();
          socket.emit('user:identify', {
            id: response.user.id,
            username: response.user.username,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        disconnectSocket();
        set({ user: null, token: null });
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
);

import { create } from 'zustand';
import api from '../api/client';

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ token, user, isLoading: false, error: null });
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Please check your credentials.';
      set({ isLoading: false, error: message });
      return { success: false, message };
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, error: null });
  },

  updateUser: (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    set({ user: updatedUser });
  },
}));

import { create } from 'zustand';

export const useUiStore = create((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Notification Toast state
  notification: null,
  showNotification: (message, type = 'success') => {
    set({ notification: { message, type, id: Date.now() } });
    setTimeout(() => {
      set({ notification: null });
    }, 4000);
  },
  clearNotification: () => set({ notification: null }),
}));

import { create } from 'zustand';

interface UIState {
  isSidebarOpen: boolean;
  isModalOpen: boolean;
  currentModal: string | null;
  theme: 'light' | 'dark' | 'system';

  toggleSidebar: () => void;
  closeSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useUIStore = create<UIState>(set => ({
  isSidebarOpen: false,
  isModalOpen: false,
  currentModal: null,
  theme: 'system',

  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
  openModal: modalId => set({ isModalOpen: true, currentModal: modalId }),
  closeModal: () => set({ isModalOpen: false, currentModal: null }),
  setTheme: theme => set({ theme }),
}));

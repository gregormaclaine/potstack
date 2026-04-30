import { create } from "zustand";

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementCount: (by?: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  decrementCount: (by = 1) => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - by) })),
}));

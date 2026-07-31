import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

const SecureStorageAdapter = {
  getItem: async (name: string): Promise<string | null> => {
    return (await SecureStore.getItemAsync(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await SecureStore.deleteItemAsync(name);
  },
};

export type OfflineAction = {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'START_BREAK' | 'END_BREAK';
  payload: any;
  timestamp: number;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  error?: string;
};

interface AttendanceOfflineStore {
  syncQueue: OfflineAction[];
  currentRecord: any | null;
  lastSyncedAt: number | null;

  // Actions
  addOfflineAction: (action: Omit<OfflineAction, 'id' | 'timestamp' | 'status'>) => void;
  removeAction: (id: string) => void;
  updateActionStatus: (id: string, status: OfflineAction['status'], error?: string) => void;
  setRecord: (record: any | null) => void;
  setLastSyncedAt: (timestamp: number) => void;
  clearQueue: () => void;
}

export const useAttendanceOfflineStore = create<AttendanceOfflineStore>()(
  persist(
    (set) => ({
      syncQueue: [],
      currentRecord: null,
      lastSyncedAt: null,

      addOfflineAction: (action) =>
        set((state) => ({
          syncQueue: [
            ...state.syncQueue,
            {
              ...action,
              id: Math.random().toString(36).substring(7),
              timestamp: Date.now(),
              status: 'PENDING',
            },
          ],
        })),

      removeAction: (id) =>
        set((state) => ({
          syncQueue: state.syncQueue.filter((a) => a.id !== id),
        })),

      updateActionStatus: (id, status, error) =>
        set((state) => ({
          syncQueue: state.syncQueue.map((a) =>
            a.id === id ? { ...a, status, error } : a
          ),
        })),

      setRecord: (currentRecord) => set({ currentRecord }),

      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),

      clearQueue: () => set({ syncQueue: [] }),
    }),
    {
      name: "attendance-offline-storage",
      storage: createJSONStorage(() => SecureStorageAdapter),
    }
  )
);

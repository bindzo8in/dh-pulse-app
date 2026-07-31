// stores/selfie-store.ts

import { create } from "zustand";

type SelfieStore = {
  uri: string | null;
  setUri: (uri: string | null) => void;
};

export const useSelfieStore = create<SelfieStore>((set) => ({
  uri: null,
  setUri: (uri) => set({ uri }),
}));
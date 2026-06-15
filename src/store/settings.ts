import { create } from "zustand";

export type StylePreset = "neon" | "aurora" | "ember";

export const STYLE_HUES: Record<StylePreset, number[]> = {
  neon: [48, 190, 320, 265, 150],
  aurora: [150, 175, 200, 250, 290],
  ember: [0, 22, 42, 350, 28],
};

export const STYLE_LABEL: Record<StylePreset, string> = {
  neon: "霓虹",
  aurora: "极光",
  ember: "余烬",
};

export interface ParticleSettings {
  preset: StylePreset;
  intensity: number;
  showSkeleton: boolean;
  showLinks: boolean;
  showVideo: boolean;
}

interface SettingsStore extends ParticleSettings {
  setPreset: (p: StylePreset) => void;
  setIntensity: (n: number) => void;
  toggleSkeleton: () => void;
  toggleLinks: () => void;
  toggleVideo: () => void;
}

export const useSettings = create<SettingsStore>((set) => ({
  preset: "neon",
  intensity: 1,
  showSkeleton: false,
  showLinks: true,
  showVideo: true,
  setPreset: (preset) => set({ preset }),
  setIntensity: (intensity) => set({ intensity }),
  toggleSkeleton: () => set((s) => ({ showSkeleton: !s.showSkeleton })),
  toggleLinks: () => set((s) => ({ showLinks: !s.showLinks })),
  toggleVideo: () => set((s) => ({ showVideo: !s.showVideo })),
}));

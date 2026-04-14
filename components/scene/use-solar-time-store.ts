"use client";

import { create } from "zustand";

import type { OrbitPreset } from "@/types";

type ScaleMode = "real" | "teaching";

interface SceneOrbitContext {
  preset: OrbitPreset | null;
  coverageStart: string | null;
  coverageEnd: string | null;
}

interface SolarTimeState {
  timestamp: string;
  playing: boolean;
  speed: number;
  scaleMode: ScaleMode;
  showLabels: boolean;
  showOrbits: boolean;
  showNotes: boolean;
  currentPreset: OrbitPreset | null;
  coverageStart: string | null;
  coverageEnd: string | null;
  boundaryMessage: string | null;
  setTimestamp: (timestamp: string) => void;
  togglePlaying: () => void;
  setSpeed: (speed: number) => void;
  setScaleMode: (mode: ScaleMode) => void;
  toggleLabels: () => void;
  toggleOrbits: () => void;
  toggleNotes: () => void;
  setSceneOrbitContext: (context: SceneOrbitContext) => void;
  advanceTime: (hours: number) => void;
  clearBoundaryMessage: () => void;
  resetToNow: () => void;
}

function clampTimestamp(timestamp: string, coverageStart: string | null, coverageEnd: string | null) {
  const value = new Date(timestamp).getTime();
  const min = coverageStart ? new Date(coverageStart).getTime() : null;
  const max = coverageEnd ? new Date(coverageEnd).getTime() : null;

  if (min !== null && value < min) {
    return new Date(min).toISOString();
  }

  if (max !== null && value > max) {
    return new Date(max).toISOString();
  }

  return timestamp;
}

export const useSolarTimeStore = create<SolarTimeState>((set) => ({
  timestamp: "2026-04-14T00:00:00.000Z",
  playing: false,
  speed: 24,
  scaleMode: "teaching",
  showLabels: true,
  showOrbits: true,
  showNotes: true,
  currentPreset: null,
  coverageStart: null,
  coverageEnd: null,
  boundaryMessage: null,
  setTimestamp: (timestamp) =>
    set((state) => ({
      timestamp: clampTimestamp(timestamp, state.coverageStart, state.coverageEnd),
      boundaryMessage: null,
    })),
  togglePlaying: () =>
    set((state) => ({
      playing: !state.playing,
      boundaryMessage: state.playing ? state.boundaryMessage : null,
    })),
  setSpeed: (speed) => set({ speed }),
  setScaleMode: (scaleMode) => set({ scaleMode }),
  toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
  toggleOrbits: () => set((state) => ({ showOrbits: !state.showOrbits })),
  toggleNotes: () => set((state) => ({ showNotes: !state.showNotes })),
  setSceneOrbitContext: (context) =>
    set((state) => ({
      currentPreset: context.preset,
      coverageStart: context.coverageStart,
      coverageEnd: context.coverageEnd,
      timestamp: clampTimestamp(state.timestamp, context.coverageStart, context.coverageEnd),
    })),
  advanceTime: (hours) =>
    set((state) => {
      const nextTimestamp = new Date(
        new Date(state.timestamp).getTime() + hours * 60 * 60 * 1000,
      ).toISOString();
      const clamped = clampTimestamp(nextTimestamp, state.coverageStart, state.coverageEnd);
      const hitBoundary = clamped !== nextTimestamp;

      return {
        timestamp: clamped,
        playing: hitBoundary ? false : state.playing,
        boundaryMessage: hitBoundary ? "已到当前轨道缓存的时间边界" : null,
      };
    }),
  clearBoundaryMessage: () => set({ boundaryMessage: null }),
  resetToNow: () =>
    set((state) => ({
      timestamp: clampTimestamp(new Date().toISOString(), state.coverageStart, state.coverageEnd),
      boundaryMessage: null,
    })),
}));

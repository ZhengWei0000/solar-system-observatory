"use client";

import { Pause, Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { useSolarTimeStore } from "./use-solar-time-store";

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs transition",
        active
          ? "border-amber-300/40 bg-amber-400/10 text-amber-100"
          : "border-slate-700 bg-slate-950/40 text-slate-300 hover:border-slate-500",
      )}
    >
      {children}
    </button>
  );
}

export function SceneControlPanel() {
  const {
    playing,
    speed,
    scaleMode,
    showLabels,
    showOrbits,
    showNotes,
    currentPreset,
    coverageStart,
    coverageEnd,
    boundaryMessage,
    togglePlaying,
    setSpeed,
    setScaleMode,
    toggleLabels,
    toggleOrbits,
    toggleNotes,
    resetToNow,
    clearBoundaryMessage,
  } = useSolarTimeStore();

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-3xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={togglePlaying}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          {playing ? "暂停" : "播放"}
        </button>
        <button
          type="button"
          onClick={resetToNow}
          className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/40 px-4 py-2 text-sm text-slate-200"
        >
          <RotateCcw className="size-4" />
          回到现在
        </button>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-slate-400">时间倍率</div>
        <div className="flex flex-wrap gap-2">
          {[1, 24, 168, 720].map((candidate) => (
            <ToggleButton key={candidate} active={speed === candidate} onClick={() => setSpeed(candidate)}>
              {candidate === 1 ? "实时" : `${candidate}x`}
            </ToggleButton>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-slate-400">比例模式</div>
        <div className="flex gap-2">
          <ToggleButton active={scaleMode === "real"} onClick={() => setScaleMode("real")}>
            真实比例模式
          </ToggleButton>
          <ToggleButton active={scaleMode === "teaching"} onClick={() => setScaleMode("teaching")}>
            教学压缩模式
          </ToggleButton>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-xs uppercase tracking-[0.28em] text-slate-400">图层开关</div>
        <div className="flex flex-wrap gap-2">
          <ToggleButton active={showLabels} onClick={toggleLabels}>
            名称
          </ToggleButton>
          <ToggleButton active={showOrbits} onClick={toggleOrbits}>
            轨道线
          </ToggleButton>
          <ToggleButton active={showNotes} onClick={toggleNotes}>
            说明层
          </ToggleButton>
        </div>
      </div>

      {currentPreset ? (
        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 text-xs leading-6 text-slate-300">
          <div className="uppercase tracking-[0.28em] text-slate-500">轨道缓存</div>
          <div className="mt-2">preset: {currentPreset}</div>
          <div>coverage: {coverageStart ?? "暂无"} → {coverageEnd ?? "暂无"}</div>
        </div>
      ) : null}

      {boundaryMessage ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-3 text-xs leading-6 text-amber-100">
          <div>{boundaryMessage}</div>
          <button type="button" onClick={clearBoundaryMessage} className="mt-2 underline underline-offset-4">
            关闭提示
          </button>
        </div>
      ) : null}
    </div>
  );
}

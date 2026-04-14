"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Body } from "@/types";

import { formatNumber } from "@/lib/utils/format";

import { ModelGradeChip } from "../body/model-grade-chip";

type SortMode = "radius" | "orbit" | "discovery";

function parseDiscoveryYear(value: string | null | undefined) {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const match = value.match(/\b(1[0-9]{3}|20[0-9]{2})\b/);
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
}

export function SatelliteListPanel({
  satellites,
}: {
  satellites: Body[];
}) {
  const [sortMode, setSortMode] = useState<SortMode>("radius");
  const [highFidelityOnly, setHighFidelityOnly] = useState(false);

  const list = useMemo(() => {
    const filtered = satellites.filter((satellite) =>
      highFidelityOnly ? satellite.hasHighFidelityShape : true,
    );

    return [...filtered].sort((a, b) => {
      if (sortMode === "radius") {
        return (b.meanRadiusKm ?? -1) - (a.meanRadiusKm ?? -1);
      }

      if (sortMode === "orbit") {
        return (a.semiMajorAxisKm ?? Number.POSITIVE_INFINITY) - (b.semiMajorAxisKm ?? Number.POSITIVE_INFINITY);
      }

      return parseDiscoveryYear(a.discoveryText) - parseDiscoveryYear(b.discoveryText);
    });
  }, [highFidelityOnly, satellites, sortMode]);

  return (
    <div className="glass-panel rounded-[2rem] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-slate-400">卫星目录</div>
          <div className="mt-2 text-2xl font-semibold text-slate-50">{list.length}</div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
            className="rounded-full border border-slate-700 bg-slate-950/50 px-3 py-2 text-slate-200"
          >
            <option value="radius">按半径排序</option>
            <option value="orbit">按轨道半径排序</option>
            <option value="discovery">按发现时间排序</option>
          </select>
          <button
            type="button"
            onClick={() => setHighFidelityOnly((value) => !value)}
            className={`rounded-full border px-3 py-2 ${
              highFidelityOnly
                ? "border-cyan-300/35 bg-cyan-400/10 text-cyan-100"
                : "border-slate-700 bg-slate-950/50 text-slate-300"
            }`}
          >
            仅真实形状模型
          </button>
        </div>
      </div>

      <div className="mt-5 max-h-[560px] space-y-3 overflow-y-auto pr-1">
        {list.map((satellite) => (
          <Link
            key={satellite.id}
            href={`/body/${satellite.slug}`}
            className="block rounded-2xl border border-slate-800/70 bg-slate-950/35 p-4 transition hover:border-cyan-300/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-slate-50">
                  {satellite.chineseName} · {satellite.englishName}
                </div>
                <div className="mt-1 text-xs text-slate-400">{satellite.discoveryText ?? "发现信息待补充"}</div>
              </div>
              <ModelGradeChip grade={satellite.modelGrade} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm text-slate-300">
              <div>平均半径：{formatNumber(satellite.meanRadiusKm)}</div>
              <div>轨道半径：{formatNumber(satellite.semiMajorAxisKm)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

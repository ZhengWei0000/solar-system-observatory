import type { Body } from "@/types";

import { formatNumber } from "@/lib/utils/format";

const rows = [
  { key: "meanRadiusKm", label: "平均半径", unit: "km" },
  { key: "massKg", label: "质量", unit: "kg" },
  { key: "density", label: "密度", unit: "g/cm³" },
  { key: "gravity", label: "表面重力", unit: "m/s²" },
  { key: "escapeVelocity", label: "逃逸速度", unit: "km/s" },
  { key: "albedo", label: "几何反照率", unit: "" },
  { key: "rotationPeriodHours", label: "自转周期", unit: "h" },
  { key: "orbitalPeriodDays", label: "公转周期", unit: "d" },
  { key: "semiMajorAxisKm", label: "半长轴", unit: "km" },
  { key: "eccentricity", label: "偏心率", unit: "" },
  { key: "inclinationDeg", label: "轨道倾角", unit: "°" },
] as const;

export function ParameterGrid({ body }: { body: Body }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => {
        const value = body[row.key];

        return (
          <div key={row.key} className="glass-panel rounded-2xl p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{row.label}</div>
            <div className="mt-2 text-lg font-semibold text-slate-50">
              {formatNumber(typeof value === "number" ? value : null, row.key === "massKg" ? 0 : 2)}
              {value !== null && value !== undefined && row.unit ? (
                <span className="ml-2 text-sm text-slate-400">{row.unit}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import type { ModelGrade } from "@/types";

import { formatModelGrade } from "@/lib/utils/format";

import { Pill } from "../ui/pill";

const toneMap: Record<ModelGrade, string> = {
  S: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  A: "border-cyan-400/30 bg-cyan-500/10 text-cyan-200",
  B: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  C: "border-rose-400/30 bg-rose-500/10 text-rose-100",
};

export function ModelGradeChip({ grade }: { grade: ModelGrade }) {
  return <Pill className={toneMap[grade]}>{formatModelGrade(grade)}</Pill>;
}

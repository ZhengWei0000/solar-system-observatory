import Link from "next/link";

import type { Body } from "@/types";

import { getAppearanceShapeSourceSummary } from "@/lib/appearance/planet-appearance";
import { getBodyDisplayName } from "@/lib/utils/format";

import { ModelGradeChip } from "./model-grade-chip";

export function BodyCard({
  body,
  href = `/body/${body.slug}`,
}: {
  body: Body;
  href?: string;
}) {
  const shapeSummary = getAppearanceShapeSourceSummary(body.id, body.shapeSource);

  return (
    <Link href={href} className="glass-panel block rounded-3xl p-5 transition hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg text-slate-50">{getBodyDisplayName(body)}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-400">{body.officialName}</div>
        </div>
        <ModelGradeChip grade={body.modelGrade} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{body.descriptionOneLine}</p>
      <div className="mt-4 text-xs leading-5 text-slate-500">{shapeSummary}</div>
    </Link>
  );
}

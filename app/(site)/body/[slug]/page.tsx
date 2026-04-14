import Link from "next/link";
import { notFound } from "next/navigation";

import { BodyCard } from "@/components/body/body-card";
import { BodyViewer } from "@/components/scene/body-viewer";
import { ModelGradeChip } from "@/components/body/model-grade-chip";
import { ParameterGrid } from "@/components/body/parameter-grid";
import { SourceTags } from "@/components/body/source-tags";
import { Pill } from "@/components/ui/pill";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getAppearanceShapeSourceSummary,
  getPlanetAppearanceProfile,
  getAppearanceTextureSourceSummary,
} from "@/lib/appearance/planet-appearance";
import {
  formatBodyType,
  formatDate,
  formatOrbitAvailability,
  formatOrbitDataKind,
} from "@/lib/utils/format";
import {
  getBodyBySlug,
  getOrbitResponse,
  getRelatedBodies,
  getSystems,
} from "@/lib/data/repository";

export default async function BodyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const body = await getBodyBySlug(slug);

  if (!body) {
    notFound();
  }

  const [systems, relatedBodies, orbitResponse] = await Promise.all([
    getSystems(),
    getRelatedBodies(body),
    getOrbitResponse(body.id),
  ]);

  const system = body.systemId ? systems.find((item) => item.id === body.systemId) : null;
  const appearanceProfile = getPlanetAppearanceProfile(body.id);
  const visualShapeSummary = getAppearanceShapeSourceSummary(body.id, body.shapeSource);
  const textureSummary = getAppearanceTextureSourceSummary(body.id);
  const shapeSources = Array.from(new Set(body.sources.shape ?? []));
  const textureSources = Array.from(
    new Set(
      appearanceProfile
        ? [
            `Primary texture provenance: ${appearanceProfile.textureSourceType}`,
            appearanceProfile.textureSourceNote,
            ...(appearanceProfile.supportMapSourceNote
              ? [`Support maps: ${appearanceProfile.supportMapSourceNote}`]
              : []),
            ...(appearanceProfile.fallbackMaps
              ? ["Fallback layer: SVG fallback atlases remain bundled for offline compatibility"]
              : []),
          ]
        : [],
    ),
  );
  const appearanceReferences = Array.from(new Set(appearanceProfile?.sourceLinks ?? []));

  return (
    <div className="section-shell space-y-10 py-10">
      <SectionHeading eyebrow={body.officialName} title={`${body.chineseName} · ${body.englishName}`} description={body.descriptionOneLine} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_420px]">
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex flex-wrap items-center gap-3">
              <Pill>{formatBodyType(body.bodyType)}</Pill>
              <ModelGradeChip grade={body.modelGrade} />
              <Pill>{formatOrbitDataKind(orbitResponse.orbitDataKind)}</Pill>
              <Pill>{formatOrbitAvailability(orbitResponse.orbitAvailability)}</Pill>
            </div>
            <div className="mt-5">
              <BodyViewer body={body} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="glass-panel rounded-3xl p-5">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">短简介</div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{body.descriptionShort}</p>
            </div>
            <div className="glass-panel rounded-3xl p-5">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">标准简介</div>
              <p className="mt-4 text-sm leading-7 text-slate-300">{body.descriptionMedium}</p>
            </div>
          </div>

          <div className="space-y-4">
            <SectionHeading title="参数卡" description="物理参数与轨道字段都来自结构化数据层，缺失值不会被伪造填充。" />
            <ParameterGrid body={body} />
          </div>

          <div className="glass-panel rounded-3xl p-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">轨道信息</div>
                <div className="mt-3 text-sm leading-7 text-slate-300">
                  orbitSource: {body.orbitSource}
                  <br />
                  状态: {orbitResponse.status}
                  <br />
                  preset: {orbitResponse.preset ?? "auto / none"}
                  <br />
                  centerBody: {orbitResponse.centerBodyId ?? "N/A"}
                  <br />
                  cache:{" "}
                  {orbitResponse.coverage
                    ? `${formatDate(orbitResponse.coverage.sampleStart)} → ${formatDate(orbitResponse.coverage.sampleEnd)}`
                    : "暂无"}
                  <br />
                  generatedAt:{" "}
                  {orbitResponse.coverage?.generatedAt
                    ? formatDate(orbitResponse.coverage.generatedAt)
                    : "暂无"}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-slate-400">自转与所属系统</div>
                <div className="mt-3 text-sm leading-7 text-slate-300">
                  自转周期: {body.rotationPeriodHours ?? "暂无"} h
                  <br />
                  所属系统:{" "}
                  {system ? <Link href={`/system/${system.slug}`}>{system.chineseName}</Link> : "不适用"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="glass-panel rounded-3xl p-5">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">来源与模型等级</div>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-300">
              <div>physicalSource: {body.physicalSource}</div>
              <div>shapeSource: {body.shapeSource}</div>
              <div>visualShape: {visualShapeSummary}</div>
              {textureSummary ? <div>textureSource: {textureSummary}</div> : null}
              <div>orbitAvailability: {formatOrbitAvailability(body.orbitAvailability)}</div>
              <div>更新时间: {formatDate(body.lastSyncedAt)}</div>
            </div>
          </div>
          <div className="glass-panel rounded-3xl p-5 space-y-5">
            <SourceTags title="Orbit Sources" values={body.sources.orbit ?? []} />
            <SourceTags title="Physical Sources" values={body.sources.physical ?? []} />
            <SourceTags title="Texture Sources" values={textureSources} />
            <SourceTags title="Appearance References" values={appearanceReferences} />
            <SourceTags title="Shape Sources" values={shapeSources} />
            <SourceTags title="Content Sources" values={body.sources.content ?? []} />
          </div>
        </aside>
      </div>

      <section className="space-y-6">
        <SectionHeading title="相关天体推荐" description="优先推荐同系统成员与同类重点对象。" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {relatedBodies.map((related) => (
            <BodyCard key={related.id} body={related} />
          ))}
        </div>
      </section>
    </div>
  );
}

import { notFound } from "next/navigation";

import { SceneControlPanel } from "@/components/scene/scene-control-panel";
import { SystemScene } from "@/components/scene/system-scene";
import { SatelliteListPanel } from "@/components/system/satellite-list-panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { getOrbitSample, getSystemBySlug } from "@/lib/data/repository";
import { getOrbitPresetForSystemSlug } from "@/lib/orbits/presets";

export default async function SystemPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const payload = await getSystemBySlug(slug);

  if (!payload || !payload.primary) {
    notFound();
  }

  const satellites = payload.members.filter((body) => body.bodyType === "natural_satellite");
  const preset = getOrbitPresetForSystemSlug(slug);
  const orbitEntries = await Promise.all(
    satellites.map(async (body) => [body.id, await getOrbitSample(body.id, preset ?? "auto")] as const),
  );
  const orbitSamples = Object.fromEntries(orbitEntries);

  return (
    <div className="section-shell space-y-8 py-10">
      <SectionHeading
        eyebrow={payload.system.name}
        title={payload.system.chineseName}
        description={payload.system.description.short}
      />
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <SceneControlPanel />
          <SatelliteListPanel satellites={satellites} />
        </div>
        <SystemScene
          primary={payload.primary}
          satellites={satellites}
          orbitSamples={orbitSamples}
          preset={preset}
        />
      </div>
    </div>
  );
}

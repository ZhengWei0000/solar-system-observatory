import { SceneControlPanel } from "@/components/scene/scene-control-panel";
import { SolarSystemScene } from "@/components/scene/solar-system-scene";
import { SectionHeading } from "@/components/ui/section-heading";
import { getBodies, getOrbitSample } from "@/lib/data/repository";

export default async function SolarSystemPage() {
  const preset = "overview-current" as const;
  const sceneBodies = (await getBodies()).filter((body) =>
    ["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"].includes(body.id),
  );

  const orbitEntries = await Promise.all(
    sceneBodies.map(async (body) => [body.id, await getOrbitSample(body.id, preset)] as const),
  );

  const orbitSamples = Object.fromEntries(orbitEntries);

  return (
    <div className="section-shell space-y-10 py-10">
      <SectionHeading
        eyebrow="Solar System"
        title="太阳系总览"
        description="当前总览页默认优先读取离线缓存的 Horizons 真轨迹；未覆盖对象会明确回退到参考轨道。"
      />
      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <SceneControlPanel />
          <div className="glass-panel rounded-3xl p-5 text-sm leading-7 text-slate-300">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">说明层</div>
            <p className="mt-3">
              `真实比例模式` 更强调线性距离关系；`教学压缩模式` 会压缩外侧行星距离，帮助在同一视角下理解系统结构。
            </p>
            <p className="mt-3">
              八大行星优先使用 Horizons 离线缓存驱动运动轨迹；播放超出缓存窗口时会自动暂停，而不是继续假装存在实时星历。
            </p>
          </div>
        </div>
        <SolarSystemScene bodies={sceneBodies} orbitSamples={orbitSamples} preset={preset} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, BookOpen, Database, Globe, Home, Search, Telescope } from "lucide-react";

import { BodyCard } from "@/components/body/body-card";
import { HeroScene } from "@/components/scene/hero-scene";
import { GlobalSearch } from "@/components/search/global-search";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatCard } from "@/components/ui/stat-card";
import { getBodies, getFeaturedBodies, getSystems } from "@/lib/data/repository";

export default async function HomePage() {
  const [systems, featuredBodies, bodies] = await Promise.all([
    getSystems(),
    getFeaturedBodies(6),
    getBodies(),
  ]);
  const heroBodies = bodies.filter((body) =>
    ["sun", "earth", "jupiter", "saturn"].includes(body.id),
  );

  const hotSystems = systems.filter((system) =>
    ["earth", "mars", "jupiter", "saturn", "pluto"].includes(system.slug),
  );

  return (
    <div className="pb-20">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <HeroScene bodies={heroBodies} />
        </div>
        <div className="section-shell relative z-10 flex min-h-[76vh] flex-col justify-center py-20">
          <div className="max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-slate-950/55 px-4 py-2 text-xs uppercase tracking-[0.3em] text-cyan-200">
              <Telescope className="size-4" />
              真实数据 + 透明模型等级
            </div>
            <div className="space-y-5">
              <h1 className="font-display text-5xl uppercase tracking-[0.08em] text-white md:text-7xl">
                A cinematic solar system atlas for observation and learning.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-200">
                用结构化参数、来源标签、参考轨道和分级模型，把“看见太阳系”升级为“看懂太阳系”。
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/solar-system"
                className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
              >
                进入太阳系总览
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sources"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/15 bg-slate-950/45 px-6 py-3 text-sm text-slate-100"
              >
                <Database className="size-4" />
                查看数据来源
              </Link>
              <Link
                href="/learn"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/15 bg-slate-950/45 px-6 py-3 text-sm text-slate-100"
              >
                <BookOpen className="size-4" />
                进入学习专题
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <Link href="/solar-system" className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
                <Globe className="size-3" />
                快速入口：总览
              </Link>
              <Link href="/system/earth" className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
                <Home className="size-3" />
                快速入口：地月系统
              </Link>
              <Link href="/learn" className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-200">
                <Search className="size-3" />
                快速入口：学习资料
              </Link>
            </div>
            <GlobalSearch placeholder="搜索地球、Europa、Titan、冥卫一或所属系统" />
          </div>
        </div>
      </section>

      <section className="section-shell mt-12 grid gap-4 md:grid-cols-3">
        <StatCard label="本地目录快照" value={`${bodies.length} 个天体`} hint="含行星、矮行星与长尾天然卫星条目。" />
        <StatCard label="系统入口" value={`${systems.length} 个系统`} hint="优先开放 Earth、Mars、Jupiter、Saturn、Pluto。" />
        <StatCard label="数据透明度" value="来源字段全展示" hint="轨道、物理参数、形状来源和模型等级全部显式标注。" />
      </section>

      <section className="section-shell mt-24 space-y-8">
        <SectionHeading
          eyebrow="Hot Systems"
          title="热门系统入口"
          description="优先从系统视角理解主星、卫星群、轨道层级和长尾对象。"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {hotSystems.map((system) => (
            <Link
              key={system.id}
              href={`/system/${system.slug}`}
              className="glass-panel rounded-3xl p-5 transition hover:-translate-y-1"
            >
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">{system.name}</div>
              <div className="mt-3 font-display text-2xl text-slate-50">{system.chineseName}</div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{system.description.oneLine}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="section-shell mt-24 space-y-8">
        <SectionHeading
          eyebrow="Featured Bodies"
          title="重点观测对象"
          description="先用参数、来源与科学近似模型建立正确的观察框架，再逐步升级更高精度资产。"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {featuredBodies.map((body) => (
            <BodyCard key={body.id} body={body} />
          ))}
        </div>
      </section>
    </div>
  );
}

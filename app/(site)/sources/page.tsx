import Link from "next/link";

import { SectionHeading } from "@/components/ui/section-heading";

type SourceReference = {
  title: string;
  publisher: string;
  url: string;
  note: string;
};

const sourceGroups = [
  {
    title: "轨道 / 星历真值",
    description: "真实轨迹缓存来自 JPL Horizons 向量接口；未覆盖对象明确标注为参考轨道，不伪装成实时真值。",
    references: [
      {
        title: "Horizons API Documentation",
        publisher: "JPL SSD API",
        url: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
        note: "用于 VECTORS 请求参数和返回字段定义。",
      },
      {
        title: "Horizons Lookup API Documentation",
        publisher: "JPL SSD API",
        url: "https://ssd-api.jpl.nasa.gov/doc/horizons_lookup.html",
        note: "用于对象检索与命名解析。",
      },
      {
        title: "Planetary Satellite Orbits & Ephemerides",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/sats/orbits.html",
        note: "说明卫星轨道/星历数据获取与精度边界。",
      },
      {
        title: "NAIF SPICE Toolkit",
        publisher: "JPL NAIF",
        url: "https://naif.jpl.nasa.gov/naif/",
        note: "后续高精轨道与离线批处理扩展位。",
      },
    ],
  },
  {
    title: "物理参数与目录",
    description: "半径、质量、密度、重力等参数来自 JPL SSD 对应目录页；目录与发现信息同样来自官方清单。",
    references: [
      {
        title: "Planetary Physical Parameters",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/planets/phys_par.html",
        note: "行星物理参数主来源。",
      },
      {
        title: "Planetary Satellite Physical Parameters",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/sats/phys_par/",
        note: "天然卫星物理参数主来源。",
      },
      {
        title: "Planetary Satellite Discovery Circumstances",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/sats/discovery.html",
        note: "卫星目录、发现信息与命名沿革来源。",
      },
      {
        title: "Naming of Astronomical Objects",
        publisher: "IAU",
        url: "https://www.iau.org/public/themes/naming/",
        note: "命名规则与官方命名体系参考。",
      },
    ],
  },
  {
    title: "形状数据与模型",
    description: "纹理与形状资源优先对接 NASA / JPL / PDS；视觉增强效果与真实形状模型等级分开标注。",
    references: [
      {
        title: "NASA 3D Resources",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/3d-resources/",
        note: "官方 3D 模型资源入口。",
      },
      {
        title: "NASA Photojournal",
        publisher: "JPL",
        url: "https://photojournal.jpl.nasa.gov/",
        note: "行星表面纹理与任务影像来源。",
      },
      {
        title: "NASA Visible Earth",
        publisher: "NASA EOSDIS",
        url: "https://visibleearth.nasa.gov/",
        note: "地球纹理与全球可视化图层来源。",
      },
      {
        title: "NASA Planetary Data System (PDS)",
        publisher: "NASA PDS",
        url: "https://pds.nasa.gov/",
        note: "科研级形状/地形数据与任务档案入口。",
      },
    ],
  },
];

const fieldDefinitions: Array<{
  field: string;
  meaning: string;
  reliabilityRule: string;
  references: SourceReference[];
}> = [
  {
    field: "orbitSource / orbitDataKind / orbitAvailability",
    meaning:
      "轨道字段用于区分真实 Horizons 缓存与教学参考轨道。`horizons_sampled` 表示离线缓存状态向量，`mean_elements_reference` 表示教学参考轨道，`manual_reference` 用于非轨道对象或手工说明。",
    reliabilityRule:
      "页面会显式显示缓存覆盖时间窗与生成时间；未覆盖对象不会伪装成实时真值。",
    references: [
      {
        title: "Horizons API Documentation",
        publisher: "JPL SSD API",
        url: "https://ssd-api.jpl.nasa.gov/doc/horizons.html",
        note: "VECTORS 字段与请求参数的权威定义。",
      },
      {
        title: "Planetary Satellite Orbits & Ephemerides",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/sats/orbits.html",
        note: "卫星轨道/星历获取方法与精度边界说明。",
      },
    ],
  },
  {
    field: "physicalSource",
    meaning:
      "用于追溯半径、质量、密度、重力、逃逸速度等参数的原始来源，避免无来源字段。",
    reliabilityRule:
      "参数缺失保持为空值，不用插值或“看起来合理”的数值补全。",
    references: [
      {
        title: "Planetary Physical Parameters",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/planets/phys_par.html",
        note: "行星参数来源。",
      },
      {
        title: "Planetary Satellite Physical Parameters",
        publisher: "JPL SSD",
        url: "https://ssd.jpl.nasa.gov/sats/phys_par/",
        note: "卫星参数来源。",
      },
    ],
  },
  {
    field: "shapeSource / textureSource / visualAppearanceSource",
    meaning:
      "区分形状模型来源与外观纹理来源。高质量纹理不等于真实形状网格；两者独立追溯。",
    reliabilityRule:
      "主纹理、辅助贴图和 fallback 都分开标注，避免把本地派生贴图误标为官方网格。",
    references: [
      {
        title: "NASA 3D Resources",
        publisher: "NASA Science",
        url: "https://science.nasa.gov/3d-resources/",
        note: "官方可下载模型来源。",
      },
      {
        title: "NASA Planetary Data System (PDS)",
        publisher: "NASA PDS",
        url: "https://pds.nasa.gov/",
        note: "科研档案与形状数据入口。",
      },
      {
        title: "NASA Photojournal",
        publisher: "JPL",
        url: "https://photojournal.jpl.nasa.gov/",
        note: "高质量任务纹理/影像来源。",
      },
    ],
  },
  {
    field: "modelGrade (S / A / B / C)",
    meaning:
      "模型等级是站点内的工程分级，不是天文机构标准。S/A 仅用于可追溯真实形状模型，B/C 为科学近似或占位。",
    reliabilityRule:
      "视觉效果再强，如果底层仍是近似球体，也保持 B 级，不会升级为 S/A。",
    references: [
      {
        title: "Model Grade Policy (This Project)",
        publisher: "solar-system-observatory",
        url: "/sources",
        note: "站点内模型分级规范与展示规则。",
      },
    ],
  },
  {
    field: "sources.orbit / sources.physical / sources.shape / sources.content",
    meaning:
      "每个天体详情页都展示字段级引用数组，直接指向用于该对象的数据来源链接。",
    reliabilityRule:
      "来源标签展示的是当前对象实际绑定的数据源，而不是全站通用宣传列表。",
    references: [
      {
        title: "Body Detail API",
        publisher: "solar-system-observatory",
        url: "/api/bodies/earth",
        note: "可直接查看单对象 `sources` 字段结构。",
      },
    ],
  },
];

export default function SourcesPage() {
  return (
    <div className="section-shell space-y-8 py-10">
      <SectionHeading
        eyebrow="Sources"
        title="数据来源与模型等级"
        description="以下条目均为可点击、可追溯来源。页面会明确区分真实参数、参考轨道与模型等级，不用营销语气掩盖边界。"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {sourceGroups.map((group) => (
          <section key={group.title} className="glass-panel rounded-3xl p-6">
            <h2 className="font-display text-2xl text-slate-50">{group.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{group.description}</p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
              {group.references.map((ref) => (
                <li key={ref.url}>
                  <a href={ref.url} target="_blank" rel="noreferrer" className="text-cyan-200 transition hover:text-cyan-100">
                    {ref.title}
                  </a>
                  <div className="text-xs text-slate-400">{ref.publisher}</div>
                  <div className="text-xs text-slate-400">{ref.note}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="glass-panel rounded-3xl p-6">
        <h2 className="font-display text-2xl text-slate-50">字段说明</h2>
        <div className="mt-5 space-y-4">
          {fieldDefinitions.map((item) => (
            <article key={item.field} className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="text-sm font-semibold text-slate-100">{item.field}</div>
              <p className="mt-2 text-sm leading-7 text-slate-300">{item.meaning}</p>
              <p className="mt-2 text-sm leading-7 text-slate-400">{item.reliabilityRule}</p>
              <ul className="mt-3 space-y-2 text-xs text-slate-300">
                {item.references.map((ref) => (
                  <li key={`${item.field}-${ref.url}`}>
                    <a href={ref.url} target="_blank" rel="noreferrer" className="text-cyan-200 transition hover:text-cyan-100">
                      {ref.title}
                    </a>
                    <span className="ml-2 text-slate-500">{ref.publisher}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <Link href="/" className="mt-6 inline-flex text-sm text-amber-200">
          返回首页
        </Link>
      </section>
    </div>
  );
}

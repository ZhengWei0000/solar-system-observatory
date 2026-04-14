import type { Body, BodyType, ModelGrade, OrbitAvailability, OrbitDataKind } from "@/types";

const bodyTypeLabelMap: Record<BodyType, string> = {
  star: "恒星",
  planet: "行星",
  natural_satellite: "天然卫星",
  dwarf_planet: "矮行星",
  system_anchor: "系统锚点",
};

const modelGradeLabelMap: Record<ModelGrade, string> = {
  S: "S 级 · 官方/科研级真实模型",
  A: "A 级 · 真实形状数据二次处理",
  B: "B 级 · 科学近似模型",
  C: "C 级 · 占位近似模型",
};

const orbitDataKindLabelMap: Record<OrbitDataKind, string> = {
  horizons_sampled: "Horizons sampled / 已缓存",
  mean_elements_reference: "Reference orbit / 教学参考",
  manual_reference: "Manual reference / 非轨道对象",
};

const orbitAvailabilityLabelMap: Record<OrbitAvailability, string> = {
  horizons_cached: "已缓存官方轨迹",
  reference_only: "仅参考轨道",
  unresolved: "当前未覆盖官方轨迹",
};

export function formatBodyType(bodyType: BodyType) {
  return bodyTypeLabelMap[bodyType];
}

export function formatModelGrade(modelGrade: ModelGrade) {
  return modelGradeLabelMap[modelGrade];
}

export function formatOrbitDataKind(value: OrbitDataKind) {
  return orbitDataKindLabelMap[value];
}

export function formatOrbitAvailability(value: OrbitAvailability) {
  return orbitAvailabilityLabelMap[value];
}

export function formatNumber(value: number | null | undefined, maximumFractionDigits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "暂无";
  }

  return new Intl.NumberFormat("zh-CN", {
    maximumFractionDigits,
  }).format(value);
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(dateString));
}

export function getBodyDisplayName(body: Pick<Body, "chineseName" | "englishName" | "officialName">) {
  return `${body.chineseName} · ${body.englishName}`;
}

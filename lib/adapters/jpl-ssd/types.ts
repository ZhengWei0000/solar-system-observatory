export interface SatelliteDiscoveryRecord {
  parentName: string;
  officialName: string;
  provisionalDesignation: string | null;
  iauNumber: string | null;
  discoveryText: string | null;
  discoveryYear: number | null;
  discovererText: string | null;
  referenceText: string | null;
}

export interface PlanetPhysicalRecord {
  englishName: string;
  equatorialRadiusKm: number | null;
  meanRadiusKm: number | null;
  massKg: number | null;
  density: number | null;
  rotationPeriodHours: number | null;
  orbitalPeriodDays: number | null;
  albedo: number | null;
  gravity: number | null;
  escapeVelocity: number | null;
}

export interface SatellitePhysicalRecord {
  parentName: string;
  officialName: string;
  naifId: string | null;
  gmKm3s2: number | null;
  meanRadiusKm: number | null;
  density: number | null;
  massKg: number | null;
}

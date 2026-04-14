import { z } from "zod";

import {
  BODY_TYPES,
  CATALOG_STATUSES,
  MODEL_GRADES,
  ORBIT_AVAILABILITY,
  ORBIT_DATA_KINDS,
  ORBIT_PRESETS,
} from "@/types";

const sourcesSchema = z
  .object({
    orbit: z.array(z.string()).optional(),
    physical: z.array(z.string()).optional(),
    shape: z.array(z.string()).optional(),
    content: z.array(z.string()).optional(),
  })
  .strict();

export const bodySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    officialName: z.string(),
    chineseName: z.string(),
    englishName: z.string(),
    aliases: z.array(z.string()),
    bodyType: z.enum(BODY_TYPES),
    parentId: z.string().nullable(),
    systemId: z.string().nullable(),
    orbitSource: z.string(),
    physicalSource: z.string(),
    shapeSource: z.string(),
    modelGrade: z.enum(MODEL_GRADES),
    descriptionOneLine: z.string(),
    descriptionShort: z.string(),
    descriptionMedium: z.string(),
    descriptionLong: z.string().optional(),
    radiusKm: z.number().nullable().optional(),
    meanRadiusKm: z.number().nullable().optional(),
    triAxialRadiiKm: z.tuple([z.number(), z.number(), z.number()]).nullable().optional(),
    massKg: z.number().nullable().optional(),
    density: z.number().nullable().optional(),
    gravity: z.number().nullable().optional(),
    escapeVelocity: z.number().nullable().optional(),
    albedo: z.number().nullable().optional(),
    rotationPeriodHours: z.number().nullable().optional(),
    orbitalPeriodDays: z.number().nullable().optional(),
    semiMajorAxisKm: z.number().nullable().optional(),
    eccentricity: z.number().nullable().optional(),
    inclinationDeg: z.number().nullable().optional(),
    discoveryText: z.string().nullable().optional(),
    texturePath: z.string().nullable().optional(),
    modelPath: z.string().nullable().optional(),
    thumbnailPath: z.string().nullable().optional(),
    hasHighFidelityShape: z.boolean(),
    featured: z.boolean(),
    lastSyncedAt: z.string(),
    horizonsId: z.string().nullable(),
    naifId: z.string().nullable(),
    provisionalDesignation: z.string().nullable().default(null),
    iauNumber: z.string().nullable().default(null),
    discoveryYear: z.number().nullable().default(null),
    orbitDataKind: z.enum(ORBIT_DATA_KINDS),
    orbitAvailability: z.enum(ORBIT_AVAILABILITY).default("reference_only"),
    catalogStatus: z.enum(CATALOG_STATUSES),
    sources: sourcesSchema,
  })
  .strict();

export const bodiesSchema = z.array(bodySchema);

export const planetSystemSchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    chineseName: z.string(),
    primaryBodyId: z.string(),
    memberIds: z.array(z.string()),
    featuredBodyIds: z.array(z.string()),
    stats: z.object({
      totalBodies: z.number(),
      naturalSatellites: z.number(),
      withHighFidelityShape: z.number(),
    }),
    orbitCoverage: z.object({
      sampledBodyIds: z.array(z.string()),
      referenceOnlyBodyIds: z.array(z.string()),
    }),
    description: z.object({
      oneLine: z.string(),
      short: z.string(),
    }),
  })
  .strict();

export const systemsSchema = z.array(planetSystemSchema);

export const orbitSampleSchema = z
  .object({
    bodyId: z.string(),
    preset: z.enum(ORBIT_PRESETS).default("overview-current"),
    source: z.string(),
    centerBodyId: z.string().default("sun"),
    frame: z.string(),
    refPlane: z.string().default("ECLIPTIC"),
    refSystem: z.string().default("ICRF"),
    units: z.string().default("KM-S"),
    generatedAt: z.string().default("1970-01-01T00:00:00.000Z"),
    requestedRange: z
      .object({
        start: z.string(),
        stop: z.string(),
        step: z.string(),
      })
      .strict()
      .default({
        start: "1970-01-01T00:00:00.000Z",
        stop: "1970-01-01T00:00:00.000Z",
        step: "1 d",
      }),
    sampleStart: z.string(),
    sampleEnd: z.string(),
    stepHours: z.number(),
    points: z.array(
      z
        .object({
          t: z.string(),
          x: z.number(),
          y: z.number(),
          z: z.number(),
          vx: z.number().default(0),
          vy: z.number().default(0),
          vz: z.number().default(0),
        })
        .strict(),
    ),
    isReferenceOnly: z.boolean(),
  })
  .strict();

export const orbitManifestItemSchema = z
  .object({
    bodyId: z.string(),
    preset: z.enum(ORBIT_PRESETS),
    source: z.string(),
    centerBodyId: z.string(),
    orbitDataKind: z.enum(ORBIT_DATA_KINDS),
    orbitAvailability: z.enum(ORBIT_AVAILABILITY),
    generatedAt: z.string(),
    sampleStart: z.string(),
    sampleEnd: z.string(),
    stepHours: z.number(),
    frame: z.string(),
    refPlane: z.string(),
    refSystem: z.string(),
    units: z.string(),
    isReferenceOnly: z.boolean(),
  })
  .strict();

export const orbitManifestSchema = z.array(orbitManifestItemSchema);

export const searchIndexSchema = z.array(
  z
    .object({
      id: z.string(),
      slug: z.string(),
      names: z.array(z.string()),
      aliases: z.array(z.string()),
      systemNames: z.array(z.string()),
      bodyType: z.enum(BODY_TYPES),
      modelGrade: z.enum(MODEL_GRADES),
      descriptionOneLine: z.string(),
      systemSlug: z.string().nullable(),
      tokens: z.array(z.string()),
    })
    .strict(),
);

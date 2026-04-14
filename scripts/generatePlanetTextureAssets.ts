import path from "node:path";

import {
  clamp01,
  createImage,
  encodePng,
  hexToRgb,
  lerp,
  mixRgb,
  resizeImage,
  setPixel,
  smoothstep,
  type RasterImage,
} from "./png-utils";
import { ensureDir, logStep, writeBinaryFile } from "./utils";

type Quality = "1k" | "2k" | "4k" | "8k";

const regularSizes: Record<Quality, { width: number; height: number }> = {
  "1k": { width: 1024, height: 512 },
  "2k": { width: 2048, height: 1024 },
  "4k": { width: 4096, height: 2048 },
  "8k": { width: 8192, height: 4096 },
};

const ringSizes: Record<Quality, { width: number; height: number }> = {
  "1k": { width: 1024, height: 128 },
  "2k": { width: 2048, height: 256 },
  "4k": { width: 4096, height: 512 },
  "8k": { width: 8192, height: 1024 },
};

type PlanetTextureOutput = Record<string, RasterImage>;

type PlanetTextureSpec = {
  slug: string;
  qualities: Quality[];
  build: () => PlanetTextureOutput;
};

type Crater = {
  cx: number;
  cy: number;
  radius: number;
  rim: number;
  depth: number;
};

function hashString(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seedText: string) {
  let seed = hashString(seedText);
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function fract(value: number) {
  return value - Math.floor(value);
}

function hash2(x: number, y: number, seed: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 19.19) * 43758.5453123);
}

function valueNoise(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const sx = x - x0;
  const sy = y - y0;

  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);

  const ux = sx * sx * (3 - 2 * sx);
  const uy = sy * sy * (3 - 2 * sy);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function fbm(x: number, y: number, seed: number, octaves = 5) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  let normalization = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    value += amplitude * valueNoise(x * frequency, y * frequency, seed + octave * 31);
    normalization += amplitude;
    amplitude *= 0.5;
    frequency *= 2.02;
  }

  return value / normalization;
}

function ridgedNoise(x: number, y: number, seed: number, octaves = 4) {
  let value = 0;
  let amplitude = 0.55;
  let frequency = 1;
  let normalization = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    const n = valueNoise(x * frequency, y * frequency, seed + octave * 41);
    value += (1 - Math.abs(2 * n - 1)) * amplitude;
    normalization += amplitude;
    amplitude *= 0.55;
    frequency *= 2.12;
  }

  return value / normalization;
}

function colorRamp(colors: string[], value: number) {
  const normalized = clamp01(value) * (colors.length - 1);
  const index = Math.floor(normalized);
  const mix = normalized - index;
  const from = hexToRgb(colors[index] ?? colors[colors.length - 1]!);
  const to = hexToRgb(colors[Math.min(colors.length - 1, index + 1)] ?? colors[colors.length - 1]!);
  return mixRgb(from, to, mix);
}

function makeCraterField(seedText: string, count: number): Crater[] {
  const rand = createRandom(seedText);
  return Array.from({ length: count }, () => ({
    cx: rand(),
    cy: rand(),
    radius: 0.004 + rand() * 0.03,
    rim: 0.25 + rand() * 0.35,
    depth: 0.1 + rand() * 0.25,
  }));
}

function applyCraterField(height: RasterImage, albedo: RasterImage, craters: Crater[]) {
  for (const crater of craters) {
    const radiusPixels = Math.max(4, Math.round(crater.radius * height.width));
    const cx = Math.round(crater.cx * height.width);
    const cy = Math.round(crater.cy * height.height);

    for (let offsetY = -radiusPixels; offsetY <= radiusPixels; offsetY += 1) {
      const y = cy + offsetY;
      if (y < 0 || y >= height.height) {
        continue;
      }

      for (let offsetX = -radiusPixels; offsetX <= radiusPixels; offsetX += 1) {
        const x = (cx + offsetX + height.width) % height.width;
        const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY) / radiusPixels;
        if (distance > 1) {
          continue;
        }

        const bowl = smoothstep(0.05, 0.9, 1 - distance) * crater.depth;
        const rim = smoothstep(crater.rim, crater.rim - 0.12, distance) * crater.depth * 0.8;
        const heightOffset = rim - bowl;
        const heightIndex = y * height.width + x;
        const baseHeight = (height.data[heightIndex] ?? 0) / 255;
        height.data[heightIndex] = Math.round(clamp01(baseHeight + heightOffset) * 255);

        const albedoIndex = (y * albedo.width + x) * albedo.channels;
        const toneShift = rim > bowl ? 12 : -12;
        albedo.data[albedoIndex] = Math.max(0, Math.min(255, (albedo.data[albedoIndex] ?? 0) + toneShift));
        albedo.data[albedoIndex + 1] = Math.max(0, Math.min(255, (albedo.data[albedoIndex + 1] ?? 0) + toneShift));
        albedo.data[albedoIndex + 2] = Math.max(0, Math.min(255, (albedo.data[albedoIndex + 2] ?? 0) + toneShift));
      }
    }
  }
}

function buildNormalMap(height: RasterImage, strength: number) {
  const normal = createImage(height.width, height.height, 3);

  for (let y = 0; y < height.height; y += 1) {
    for (let x = 0; x < height.width; x += 1) {
      const left = height.data[y * height.width + ((x - 1 + height.width) % height.width)] ?? 0;
      const right = height.data[y * height.width + ((x + 1) % height.width)] ?? 0;
      const up = height.data[Math.max(0, y - 1) * height.width + x] ?? 0;
      const down = height.data[Math.min(height.height - 1, y + 1) * height.width + x] ?? 0;

      const dx = ((right - left) / 255) * strength;
      const dy = ((down - up) / 255) * strength;
      const dz = 1;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;

      const nx = (-dx / length) * 0.5 + 0.5;
      const ny = (-dy / length) * 0.5 + 0.5;
      const nz = (dz / length) * 0.5 + 0.5;
      setPixel(normal, x, y, [
        Math.round(nx * 255),
        Math.round(ny * 255),
        Math.round(nz * 255),
      ]);
    }
  }

  return normal;
}

function rockyWorld(options: {
  slug: string;
  colors: string[];
  polarColor?: string;
  craterCount: number;
  ridgeSeedOffset?: number;
}) {
  const { width, height } = regularSizes["2k"];
  const albedo = createImage(width, height, 3);
  const heightMap = createImage(width, height, 1);
  const roughness = createImage(width, height, 1);
  const seed = hashString(options.slug);

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    const polar = 1 - Math.abs(v - 0.5) * 2;

    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const continental = fbm(u * 4, v * 3, seed, 5);
      const detail = fbm(u * 18, v * 12, seed + 17, 4);
      const ridged = ridgedNoise(
        u * 9,
        v * 8,
        seed + (options.ridgeSeedOffset ?? 23),
        4,
      );
      const terrain = clamp01(continental * 0.58 + detail * 0.22 + ridged * 0.2);
      const color = colorRamp(options.colors, terrain);
      const coldBoost = options.polarColor
        ? smoothstep(0.72, 1, Math.abs(v - 0.5) * 2)
        : 0;
      const pixel = options.polarColor && coldBoost > 0.02
        ? mixRgb(color, hexToRgb(options.polarColor), coldBoost * 0.85)
        : color;

      setPixel(albedo, x, y, [pixel.r, pixel.g, pixel.b]);
      setPixel(heightMap, x, y, [Math.round((terrain * 0.85 + polar * 0.05) * 255)]);
      setPixel(roughness, x, y, [Math.round((0.45 + terrain * 0.45) * 255)]);
    }
  }

  applyCraterField(heightMap, albedo, makeCraterField(`${options.slug}:craters`, options.craterCount));
  const normal = buildNormalMap(heightMap, 3.2);

  return {
    albedo,
    bump: heightMap,
    normal,
    roughness,
  };
}

function earthWorld() {
  const { width, height } = regularSizes["2k"];
  const albedo = createImage(width, height, 3);
  const bump = createImage(width, height, 1);
  const roughness = createImage(width, height, 1);
  const clouds = createImage(width, height, 4);
  const nightLights = createImage(width, height, 4);
  const specular = createImage(width, height, 1);
  const seed = hashString("earth");

  const oceanDeep = hexToRgb("#0a3d74");
  const oceanShallow = hexToRgb("#1f87c9");
  const landHumid = hexToRgb("#5f8f43");
  const landDry = hexToRgb("#987c4b");
  const ice = hexToRgb("#e8f4ff");

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    const latitude = Math.abs(v - 0.5) * 2;
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const continents = fbm(u * 3.2, v * 2.2, seed + 11, 6);
      const islands = fbm(u * 7.5, v * 5.3, seed + 24, 4);
      const landMask = clamp01((continents * 0.72 + islands * 0.28 - 0.44) * 1.8);
      const humidity = fbm(u * 12, v * 7, seed + 51, 4);
      const oceanMix = clamp01(0.25 + latitude * 0.4 + humidity * 0.35);
      const oceanColor = mixRgb(oceanShallow, oceanDeep, oceanMix);
      const landColor = mixRgb(landHumid, landDry, clamp01(latitude * 0.55 + (1 - humidity) * 0.45));
      const polarIce = smoothstep(0.76, 0.98, latitude);
      const mixed = landMask > 0.5
        ? mixRgb(landColor, ice, polarIce * 0.85)
        : mixRgb(oceanColor, ice, polarIce * 0.75);

      setPixel(albedo, x, y, [mixed.r, mixed.g, mixed.b]);
      setPixel(bump, x, y, [Math.round((0.1 + landMask * 0.55 + polarIce * 0.25) * 255)]);
      setPixel(roughness, x, y, [Math.round((landMask > 0.5 ? 0.62 : 0.18) * 255)]);
      setPixel(specular, x, y, [Math.round((landMask > 0.5 ? 0.18 : 0.92) * 255)]);

      const cloudNoise = fbm(u * 20, v * 11, seed + 90, 5);
      const cloudBands = fbm(u * 3, v * 24, seed + 117, 3);
      const cloudAlpha = clamp01((cloudNoise * 0.78 + cloudBands * 0.22 - 0.48) * 2.4);
      setPixel(clouds, x, y, [255, 255, 255, Math.round(cloudAlpha * 215)]);

      const cityBias = landMask * smoothstep(0.1, 0.75, humidity) * (1 - polarIce);
      const cityNoise = fbm(u * 55, v * 28, seed + 151, 3);
      const cityAlpha = clamp01((cityNoise - 0.82) * 7) * cityBias;
      setPixel(nightLights, x, y, [255, 190, 110, Math.round(cityAlpha * 235)]);
    }
  }

  return {
    albedo,
    bump,
    normal: buildNormalMap(bump, 3.8),
    roughness,
    clouds,
    "night-lights": nightLights,
    specular,
  };
}

function venusWorld() {
  const { width, height } = regularSizes["2k"];
  const albedo = createImage(width, height, 3);
  const clouds = createImage(width, height, 4);
  const roughness = createImage(width, height, 1);
  const emissive = createImage(width, height, 3);
  const seed = hashString("venus");

  const baseLight = hexToRgb("#f5d8a1");
  const baseDark = hexToRgb("#af7642");
  const cloudTint = hexToRgb("#fff2dc");

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const swirl = fbm(u * 14 + v * 4, v * 20 - u * 3, seed + 17, 5);
      const streak = fbm(u * 4, v * 48, seed + 61, 4);
      const tone = clamp01(swirl * 0.6 + streak * 0.4);
      const base = mixRgb(baseLight, baseDark, tone);
      setPixel(albedo, x, y, [base.r, base.g, base.b]);
      setPixel(roughness, x, y, [214]);

      const cloudField = clamp01((fbm(u * 26, v * 14, seed + 99, 5) - 0.34) * 1.9);
      setPixel(clouds, x, y, [cloudTint.r, cloudTint.g, cloudTint.b, Math.round(cloudField * 235)]);
      setPixel(emissive, x, y, [20, 14, 6]);
    }
  }

  return {
    albedo,
    clouds,
    roughness,
    emissive,
  };
}

function giantWorld(options: {
  slug: string;
  colors: string[];
  stormColor?: string;
  haze?: string;
  emissive?: string;
}) {
  const { width, height } = regularSizes["2k"];
  const albedo = createImage(width, height, 3);
  const clouds = createImage(width, height, 4);
  const roughness = createImage(width, height, 1);
  const emissive = createImage(width, height, 3);
  const seed = hashString(options.slug);
  const haze = hexToRgb(options.haze ?? "#fff8f0");
  const storm = options.stormColor ? hexToRgb(options.stormColor) : null;
  const emissiveColor = options.emissive ? hexToRgb(options.emissive) : null;

  for (let y = 0; y < height; y += 1) {
    const v = y / height;
    const latitude = (v - 0.5) * 2;
    const bandWave = Math.sin(latitude * 28 + fbm(0, v * 16, seed + 11, 3) * 2.6);
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const warp = fbm(u * 8, v * 24, seed + 23, 4) * 0.18 + fbm(u * 18, v * 12, seed + 37, 3) * 0.08;
      const bandIndex = clamp01((bandWave * 0.25 + 0.5) + warp);
      const base = colorRamp(options.colors, bandIndex);
      const localMist = clamp01(fbm(u * 20, v * 8, seed + 57, 3) * 0.28);
      const tone = mixRgb(base, haze, localMist);
      setPixel(albedo, x, y, [tone.r, tone.g, tone.b]);
      setPixel(roughness, x, y, [Math.round((0.3 + localMist * 0.35) * 255)]);

      const cloudField = clamp01((fbm(u * 18, v * 26, seed + 71, 5) - 0.42) * 2.2);
      setPixel(clouds, x, y, [255, 255, 255, Math.round(cloudField * 175)]);

      if (emissiveColor) {
        const glow = Math.round((0.06 + localMist * 0.08) * 255);
        setPixel(emissive, x, y, [
          Math.round((emissiveColor.r / 255) * glow),
          Math.round((emissiveColor.g / 255) * glow),
          Math.round((emissiveColor.b / 255) * glow),
        ]);
      }
    }
  }

  if (storm) {
    const cx = Math.round(width * 0.73);
    const cy = Math.round(height * 0.58);
    const rx = Math.round(width * 0.1);
    const ry = Math.round(height * 0.08);
    for (let y = -ry; y <= ry; y += 1) {
      for (let x = -rx; x <= rx; x += 1) {
        const px = cx + x;
        const py = cy + y;
        if (px < 0 || px >= width || py < 0 || py >= height) {
          continue;
        }

        const ellipse = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (ellipse > 1) {
          continue;
        }

        const intensity = smoothstep(1, 0.25, ellipse);
        const offset = (py * width + px) * 3;
        const mixed = mixRgb(
          {
            r: albedo.data[offset] ?? 0,
            g: albedo.data[offset + 1] ?? 0,
            b: albedo.data[offset + 2] ?? 0,
          },
          storm,
          intensity * 0.85,
        );
        albedo.data[offset] = mixed.r;
        albedo.data[offset + 1] = mixed.g;
        albedo.data[offset + 2] = mixed.b;
      }
    }
  }

  return { albedo, clouds, roughness, emissive };
}

function saturnRings() {
  const { width, height } = ringSizes["2k"];
  const color = createImage(width, height, 4);
  const alpha = createImage(width, height, 1);
  const roughness = createImage(width, height, 1);
  const palette = [
    "#594c40",
    "#dac8a7",
    "#88755f",
    "#f5e9cb",
    "#89735a",
    "#ece0ba",
  ];

  for (let x = 0; x < width; x += 1) {
    const u = x / width;
    const radialNoise = fbm(u * 48, 0.5, 91, 4);
    const stripes = Math.sin(u * 160) * 0.18 + Math.sin(u * 620) * 0.06 + radialNoise * 0.32;
    const alphaTone = clamp01(0.18 + Math.abs(stripes) * 0.88);
    const band = colorRamp(palette, clamp01(0.45 + stripes));
    const rough = Math.round((0.58 + Math.abs(stripes) * 0.24) * 255);

    for (let y = 0; y < height; y += 1) {
      setPixel(color, x, y, [band.r, band.g, band.b, 235]);
      setPixel(alpha, x, y, [Math.round(alphaTone * 255)]);
      setPixel(roughness, x, y, [rough]);
    }
  }

  return {
    "ring-color": color,
    "ring-alpha": alpha,
    "ring-roughness": roughness,
  };
}

function writeMipSet(
  dir: string,
  outputs: PlanetTextureOutput,
  qualities: Quality[],
  isRing = false,
) {
  return Promise.all(
    Object.entries(outputs).flatMap(([name, image]) =>
      qualities.map(async (quality) => {
        const target = isRing ? ringSizes[quality] : regularSizes[quality];
        const resized = resizeImage(image, target.width, target.height);
        await writeBinaryFile(
          path.join(dir, `${name}-${quality}.png`),
          encodePng(resized),
        );
      }),
    ),
  );
}

const textureBuilders: PlanetTextureSpec[] = [
  {
    slug: "mercury",
    qualities: ["1k", "2k", "4k"],
    build: () =>
      rockyWorld({
        slug: "mercury",
        colors: ["#43403f", "#615a56", "#7f7670", "#b1a99f", "#ddd6cd"],
        craterCount: 120,
        ridgeSeedOffset: 31,
      }),
  },
  {
    slug: "venus",
    qualities: ["1k", "2k", "4k"],
    build: venusWorld,
  },
  {
    slug: "earth",
    qualities: ["1k", "2k", "4k", "8k"],
    build: earthWorld,
  },
  {
    slug: "mars",
    qualities: ["1k", "2k", "4k", "8k"],
    build: () =>
      rockyWorld({
        slug: "mars",
        colors: ["#5b2419", "#7d3020", "#a64d2f", "#c27043", "#ead2b4"],
        polarColor: "#f3ede6",
        craterCount: 110,
        ridgeSeedOffset: 43,
      }),
  },
  {
    slug: "jupiter",
    qualities: ["1k", "2k", "4k", "8k"],
    build: () =>
      giantWorld({
        slug: "jupiter",
        colors: [
          "#7a5643",
          "#a57355",
          "#d2b59c",
          "#f1dbc6",
          "#b47d5b",
          "#e6c39d",
        ],
        stormColor: "#b45a38",
        haze: "#fff0da",
        emissive: "#8d644f",
      }),
  },
  {
    slug: "saturn",
    qualities: ["1k", "2k", "4k", "8k"],
    build: () => ({
      ...giantWorld({
        slug: "saturn",
        colors: [
          "#8f7658",
          "#d1ba95",
          "#f6e6cf",
          "#c1a27d",
          "#e2cfaa",
          "#fff1de",
        ],
        haze: "#fff4df",
      }),
      ...saturnRings(),
    }),
  },
  {
    slug: "uranus",
    qualities: ["1k", "2k", "4k"],
    build: () =>
      giantWorld({
        slug: "uranus",
        colors: ["#79d8e3", "#8ce9ef", "#a7f2f5", "#91dde7", "#c9fdff"],
        haze: "#effdff",
      }),
  },
  {
    slug: "neptune",
    qualities: ["1k", "2k", "4k"],
    build: () =>
      giantWorld({
        slug: "neptune",
        colors: ["#143b9e", "#1f5ad4", "#3372eb", "#4c8dff", "#88bbff"],
        stormColor: "#0b215f",
        haze: "#b7d4ff",
        emissive: "#27478d",
      }),
  },
  {
    slug: "pluto",
    qualities: ["1k", "2k", "4k"],
    build: () =>
      rockyWorld({
        slug: "pluto",
        colors: ["#5d4f54", "#7d6b6e", "#b89f94", "#e9dacb", "#fff7f0"],
        polarColor: "#f4ebdf",
        craterCount: 90,
        ridgeSeedOffset: 53,
      }),
  },
];

async function main() {
  const baseDir = path.join(process.cwd(), "public", "textures", "planets");

  for (const spec of textureBuilders) {
    logStep(`Generating raster maps for ${spec.slug} (${spec.qualities.join(", ")})`);
    const dir = path.join(baseDir, spec.slug);
    await ensureDir(dir);
    const outputs = spec.build();

    const planetOutputs: PlanetTextureOutput = {};
    const ringOutputs: PlanetTextureOutput = {};

    for (const [name, image] of Object.entries(outputs)) {
      if (name.startsWith("ring-")) {
        ringOutputs[name] = image;
      } else {
        planetOutputs[name] = image;
      }
    }

    await writeMipSet(dir, planetOutputs, spec.qualities, false);
    if (Object.keys(ringOutputs).length > 0) {
      await writeMipSet(dir, ringOutputs, spec.qualities, true);
    }
  }

  logStep(`Generated raster planet texture assets for ${textureBuilders.length} bodies`);
}

main().catch((error) => {
  process.stderr.write(`\n[solar-system-observatory:error] generatePlanetTextureAssets failed: ${String(error)}\n`);
  process.exit(1);
});

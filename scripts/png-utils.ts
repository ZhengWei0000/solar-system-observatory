import { deflateSync } from "node:zlib";

export type RasterImage = {
  width: number;
  height: number;
  channels: 1 | 3 | 4;
  data: Uint8Array;
};

const PNG_SIGNATURE = Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10,
]);

const crcTable = new Uint32Array(256);

for (let index = 0; index < 256; index += 1) {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  crcTable[index] = value >>> 0;
}

function crc32(buffer: Uint8Array) {
  let crc = 0xffffffff;

  for (const value of buffer) {
    crc = crcTable[(crc ^ value) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt32(value: number) {
  const bytes = new Uint8Array(4);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, value >>> 0, false);
  return bytes;
}

function chunk(type: string, payload: Uint8Array) {
  const typeBytes = new TextEncoder().encode(type);
  const crcInput = new Uint8Array(typeBytes.length + payload.length);
  crcInput.set(typeBytes, 0);
  crcInput.set(payload, typeBytes.length);

  const out = new Uint8Array(12 + payload.length);
  out.set(writeUInt32(payload.length), 0);
  out.set(typeBytes, 4);
  out.set(payload, 8);
  out.set(writeUInt32(crc32(crcInput)), 8 + payload.length);
  return out;
}

export function createImage(
  width: number,
  height: number,
  channels: 1 | 3 | 4,
  fill = 0,
): RasterImage {
  return {
    width,
    height,
    channels,
    data: new Uint8Array(width * height * channels).fill(fill),
  };
}

export function setPixel(
  image: RasterImage,
  x: number,
  y: number,
  channels: number[],
) {
  if (x < 0 || x >= image.width || y < 0 || y >= image.height) {
    return;
  }

  const offset = (y * image.width + x) * image.channels;
  for (let channel = 0; channel < image.channels; channel += 1) {
    image.data[offset + channel] = channels[channel] ?? channels[channels.length - 1] ?? 0;
  }
}

function sampleChannel(image: RasterImage, x: number, y: number, channel: number) {
  const clampedX = Math.max(0, Math.min(image.width - 1, Math.round(x)));
  const clampedY = Math.max(0, Math.min(image.height - 1, Math.round(y)));
  const offset = (clampedY * image.width + clampedX) * image.channels + channel;
  return image.data[offset] ?? 0;
}

export function resizeImage(
  image: RasterImage,
  width: number,
  height: number,
): RasterImage {
  if (image.width === width && image.height === height) {
    return {
      width: image.width,
      height: image.height,
      channels: image.channels,
      data: new Uint8Array(image.data),
    };
  }

  const output = createImage(width, height, image.channels);
  const xScale = image.width / width;
  const yScale = image.height / height;

  for (let y = 0; y < height; y += 1) {
    const sourceY = (y + 0.5) * yScale - 0.5;
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(image.height - 1, y0 + 1);
    const yMix = sourceY - y0;

    for (let x = 0; x < width; x += 1) {
      const sourceX = (x + 0.5) * xScale - 0.5;
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(image.width - 1, x0 + 1);
      const xMix = sourceX - x0;

      const values: number[] = [];

      for (let channel = 0; channel < image.channels; channel += 1) {
        const top = sampleChannel(image, x0, y0, channel) * (1 - xMix)
          + sampleChannel(image, x1, y0, channel) * xMix;
        const bottom = sampleChannel(image, x0, y1, channel) * (1 - xMix)
          + sampleChannel(image, x1, y1, channel) * xMix;
        values[channel] = Math.round(top * (1 - yMix) + bottom * yMix);
      }

      setPixel(output, x, y, values);
    }
  }

  return output;
}

export function encodePng(image: RasterImage) {
  const colorType = image.channels === 1 ? 0 : image.channels === 3 ? 2 : 6;
  const bytesPerRow = image.width * image.channels;
  const raw = new Uint8Array((bytesPerRow + 1) * image.height);

  for (let row = 0; row < image.height; row += 1) {
    const sourceOffset = row * bytesPerRow;
    const targetOffset = row * (bytesPerRow + 1);
    raw[targetOffset] = 0;
    raw.set(image.data.subarray(sourceOffset, sourceOffset + bytesPerRow), targetOffset + 1);
  }

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, image.width, false);
  view.setUint32(4, image.height, false);
  ihdr[8] = 8;
  ihdr[9] = colorType;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw, { level: 9 });
  const parts = [
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", new Uint8Array(idat)),
    chunk("IEND", new Uint8Array()),
  ];

  return Buffer.concat(parts.map((part) => Buffer.from(part)));
}

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
}

export function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  };
}

export function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
) {
  return {
    r: Math.round(lerp(a.r, b.r, t)),
    g: Math.round(lerp(a.g, b.g, t)),
    b: Math.round(lerp(a.b, b.b, t)),
  };
}

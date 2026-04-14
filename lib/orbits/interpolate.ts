import type { OrbitSample, OrbitSamplePoint } from "@/types";

export function getPointForTimestamp(sample: OrbitSample, timestamp: string): OrbitSamplePoint {
  const target = new Date(timestamp).getTime();

  if (sample.points.length === 0) {
    return { t: timestamp, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
  }

  if (sample.points.length === 1) {
    return sample.points[0]!;
  }

  for (let index = 1; index < sample.points.length; index += 1) {
    const previous = sample.points[index - 1]!;
    const current = sample.points[index]!;
    const previousTime = new Date(previous.t).getTime();
    const currentTime = new Date(current.t).getTime();

    if (target <= currentTime) {
      const span = currentTime - previousTime;
      const ratio = span === 0 ? 0 : (target - previousTime) / span;

      return {
        t: timestamp,
        x: lerp(previous.x, current.x, ratio),
        y: lerp(previous.y, current.y, ratio),
        z: lerp(previous.z, current.z, ratio),
        vx: lerp(previous.vx, current.vx, ratio),
        vy: lerp(previous.vy, current.vy, ratio),
        vz: lerp(previous.vz, current.vz, ratio),
      };
    }
  }

  return sample.points[sample.points.length - 1]!;
}

export function isTimestampWithinSample(sample: OrbitSample, timestamp: string) {
  const target = new Date(timestamp).getTime();
  return (
    target >= new Date(sample.sampleStart).getTime() &&
    target <= new Date(sample.sampleEnd).getTime()
  );
}

function lerp(start: number, end: number, ratio: number) {
  return start + (end - start) * ratio;
}

"use client";

import { Html, Line, OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { ACESFilmicToneMapping } from "three";

import { getPointForTimestamp } from "@/lib/orbits/interpolate";
import type { Body, OrbitPreset, OrbitSample } from "@/types";

import { getBodyDisplayName } from "@/lib/utils/format";

import {
  getOverviewDistance,
  getOverviewRadius,
  scaleOverviewOrbitPoints,
  scaleOverviewPoint,
} from "./scene-style";
import { CelestialBodyMesh } from "./celestial-body-mesh";
import { useSolarTimeStore } from "./use-solar-time-store";

function SceneTicker() {
  const playing = useSolarTimeStore((state) => state.playing);
  const speed = useSolarTimeStore((state) => state.speed);
  const advanceTime = useSolarTimeStore((state) => state.advanceTime);

  useEffect(() => {
    if (!playing) {
      return;
    }

    const interval = window.setInterval(() => {
      advanceTime(speed);
    }, 400);

    return () => window.clearInterval(interval);
  }, [advanceTime, playing, speed]);

  return null;
}

function getSharedCoverage(orbitSamples: Record<string, OrbitSample | null>) {
  const samples = Object.values(orbitSamples).filter((sample): sample is OrbitSample => Boolean(sample));
  if (samples.length === 0) {
    return { start: null, end: null };
  }

  const start = samples
    .map((sample) => new Date(sample.sampleStart).getTime())
    .reduce((latest, value) => Math.max(latest, value), Number.NEGATIVE_INFINITY);
  const end = samples
    .map((sample) => new Date(sample.sampleEnd).getTime())
    .reduce((earliest, value) => Math.min(earliest, value), Number.POSITIVE_INFINITY);

  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return { start: null, end: null };
  }

  return {
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}

export function SolarSystemScene({
  bodies,
  orbitSamples,
  preset,
}: {
  bodies: Body[];
  orbitSamples: Record<string, OrbitSample | null>;
  preset: OrbitPreset;
}) {
  const scaleMode = useSolarTimeStore((state) => state.scaleMode);
  const showLabels = useSolarTimeStore((state) => state.showLabels);
  const showOrbits = useSolarTimeStore((state) => state.showOrbits);
  const timestamp = useSolarTimeStore((state) => state.timestamp);
  const setSceneOrbitContext = useSolarTimeStore((state) => state.setSceneOrbitContext);

  useEffect(() => {
    const coverage = getSharedCoverage(orbitSamples);
    setSceneOrbitContext({
      preset,
      coverageStart: coverage.start,
      coverageEnd: coverage.end,
    });
  }, [orbitSamples, preset, setSceneOrbitContext]);

  return (
    <div className="h-[720px] overflow-hidden rounded-[2rem] border border-slate-800/70">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 22, 76]} fov={42} />
        <color attach="background" args={["#02040a"]} />
        <fog attach="fog" args={["#02040a", 60, 160]} />
        <ambientLight intensity={0.13} />
        <pointLight position={[0, 0, 0]} intensity={280} color="#f59e0b" />
        <pointLight position={[-24, 16, 28]} intensity={11} color="#67e8f9" />
        <pointLight position={[18, -12, 38]} intensity={3} color="#f8fafc" />
        <Stars radius={400} depth={120} count={6000} factor={4} saturation={0} fade speed={0.5} />
        <SceneTicker />

        {bodies.map((body) => {
          const orbit = orbitSamples[body.id];
          const radius = getOverviewRadius(body, scaleMode);
          const position: [number, number, number] =
            body.id === "sun"
              ? [0, 0, 0]
              : orbit
                ? scaleOverviewPoint(getPointForTimestamp(orbit, timestamp), scaleMode)
                : [getOverviewDistance(body, scaleMode), 0, 0];

          return (
            <group key={body.id}>
              {showOrbits && orbit && body.id !== "sun" ? (
                <Line
                  points={scaleOverviewOrbitPoints(orbit.points, scaleMode)}
                  color="#334155"
                  lineWidth={0.8}
                  transparent
                  opacity={0.75}
                />
              ) : null}
              <group position={position}>
                <Suspense fallback={null}>
                  <CelestialBodyMesh
                    body={body}
                    radius={radius}
                    presentation="overview"
                  />
                </Suspense>
                {showLabels ? (
                  <Html position={[0, radius + 1.2, 0]} center distanceFactor={12}>
                    <div className="rounded-full border border-slate-800/70 bg-slate-950/80 px-3 py-1 text-xs text-slate-100 backdrop-blur">
                      {getBodyDisplayName(body)}
                    </div>
                  </Html>
                ) : null}
              </group>
            </group>
          );
        })}

        <OrbitControls enablePan={false} maxDistance={160} minDistance={24} />
      </Canvas>
    </div>
  );
}

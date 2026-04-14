"use client";

import { Html, Line, OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import { ACESFilmicToneMapping } from "three";

import { getPointForTimestamp } from "@/lib/orbits/interpolate";
import type { Body, OrbitPreset, OrbitSample } from "@/types";

import { getBodyDisplayName } from "@/lib/utils/format";

import {
  getBodyColor,
  getSystemDistance,
  getSystemRadius,
  scaleSystemOrbitPoints,
  scaleSystemPoint,
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

export function SystemScene({
  primary,
  satellites,
  orbitSamples,
  preset,
}: {
  primary: Body;
  satellites: Body[];
  orbitSamples: Record<string, OrbitSample | null>;
  preset: OrbitPreset | null;
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
    <div className="h-[760px] overflow-hidden rounded-[2rem] border border-slate-800/70">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 20, 54]} fov={40} />
        <color attach="background" args={["#02040a"]} />
        <fog attach="fog" args={["#02040a", 28, 120]} />
        <ambientLight intensity={0.16} />
        <pointLight position={[0, 0, 0]} intensity={138} color={getBodyColor(primary)} />
        <pointLight position={[10, 6, 16]} intensity={6.5} color="#67e8f9" />
        <pointLight position={[-14, -6, 20]} intensity={2.5} color="#f8fafc" />
        <Stars radius={260} depth={100} count={4500} factor={3.2} saturation={0} fade speed={0.4} />
        <SceneTicker />

        <Suspense fallback={null}>
          <CelestialBodyMesh
            body={primary}
            radius={getSystemRadius(primary, scaleMode) * 1.9}
            presentation="system"
          />
        </Suspense>

        {showLabels ? (
          <Html position={[0, getSystemRadius(primary, scaleMode) * 2.8, 0]} center distanceFactor={10}>
            <div className="rounded-full border border-slate-800/70 bg-slate-950/80 px-3 py-1 text-xs text-slate-100 backdrop-blur">
              {getBodyDisplayName(primary)}
            </div>
          </Html>
        ) : null}

        {satellites.map((body, index) => {
          const orbit = orbitSamples[body.id];
          const radius = getSystemRadius(body, scaleMode);
          const position =
            orbit
              ? scaleSystemPoint(getPointForTimestamp(orbit, timestamp), scaleMode)
              : ([getSystemDistance(body, scaleMode) || 6 + index * 0.65, 0, 0] as [
                  number,
                  number,
                  number,
                ]);

          return (
            <group key={body.id}>
              {showOrbits && orbit ? (
                <Line
                  points={scaleSystemOrbitPoints(orbit.points, scaleMode)}
                  color="#334155"
                  lineWidth={0.8}
                  transparent
                  opacity={0.8}
                />
              ) : null}
              <group position={position}>
                <Suspense fallback={null}>
                  <CelestialBodyMesh
                    body={body}
                    radius={radius}
                    presentation="system"
                  />
                </Suspense>
                {showLabels ? (
                  <Html position={[0, radius + 0.8, 0]} center distanceFactor={12}>
                    <div className="rounded-xl border border-slate-800/70 bg-slate-950/85 px-3 py-1.5 text-xs text-slate-100 backdrop-blur">
                      <div>{getBodyDisplayName(body)}</div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {orbit?.isReferenceOnly ? "Reference orbit" : "Horizons sampled"}
                      </div>
                    </div>
                  </Html>
                ) : null}
              </group>
            </group>
          );
        })}

        <OrbitControls enablePan={false} maxDistance={130} minDistance={16} />
      </Canvas>
    </div>
  );
}

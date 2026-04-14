"use client";

import { OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { ACESFilmicToneMapping } from "three";

import type { Body } from "@/types";

import { CelestialBodyMesh } from "./celestial-body-mesh";

function RotatingBody({ body }: { body: Body }) {
  const ref = useRef<Group>(null);
  const radius = Math.min(4.8, Math.max(1.2, Math.log10((body.meanRadiusKm ?? body.radiusKm ?? 10) + 1)));

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.004;
    }

    state.camera.position.x = Math.sin(state.clock.getElapsedTime() * 0.16) * 0.45;
    state.camera.position.y = Math.cos(state.clock.getElapsedTime() * 0.18) * 0.16;
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={ref}>
      <CelestialBodyMesh body={body} radius={radius} presentation="detail" />
    </group>
  );
}

export function BodyViewer({ body }: { body: Body }) {
  return (
    <div className="h-[520px] overflow-hidden rounded-[2rem] border border-slate-800/70">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.16;
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={36} />
        <color attach="background" args={["#02040a"]} />
        <ambientLight intensity={0.16} />
        <pointLight position={[9, 6, 12]} intensity={42} color="#f8fafc" />
        <pointLight position={[-11, -1, -10]} intensity={9} color="#7dd3fc" />
        <pointLight position={[0, 10, -14]} intensity={6} color="#f59e0b" />
        <pointLight position={[0, -8, 10]} intensity={2.4} color="#cbd5e1" />
        <Stars radius={160} depth={90} count={2200} factor={2} saturation={0} fade speed={0.4} />
        <Suspense fallback={null}>
          <RotatingBody body={body} />
        </Suspense>
        <OrbitControls enablePan={false} maxDistance={20} minDistance={7} />
      </Canvas>
    </div>
  );
}

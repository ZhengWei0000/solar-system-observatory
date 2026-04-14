"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera, Stars } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Body } from "@/types";
import type { Group } from "three";
import { ACESFilmicToneMapping } from "three";

import { CelestialBodyMesh } from "./celestial-body-mesh";

function HeroBodies({ bodies }: { bodies: Body[] }) {
  const earthRef = useRef<Group>(null);
  const jupiterRef = useRef<Group>(null);
  const saturnRef = useRef<Group>(null);
  const sun = bodies.find((body) => body.id === "sun");
  const earth = bodies.find((body) => body.id === "earth");
  const jupiter = bodies.find((body) => body.id === "jupiter");
  const saturn = bodies.find((body) => body.id === "saturn");

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    state.camera.position.x = Math.sin(t * 0.08) * 0.9;
    state.camera.position.y = 4 + Math.cos(t * 0.12) * 0.35;
    state.camera.position.z = 20 + Math.sin(t * 0.06) * 0.6;
    state.camera.lookAt(0, 0.8, 0);

    if (earthRef.current) {
      earthRef.current.position.x = Math.sin(t * 0.35) * 6;
      earthRef.current.position.y = Math.cos(t * 0.2) * 0.8;
      earthRef.current.rotation.y += 0.01;
    }

    if (jupiterRef.current) {
      jupiterRef.current.position.x = 9 + Math.sin(t * 0.2) * 2;
      jupiterRef.current.position.z = -4 + Math.cos(t * 0.28) * 1.5;
      jupiterRef.current.rotation.y -= 0.006;
    }

    if (saturnRef.current) {
      saturnRef.current.position.x = -11 + Math.cos(t * 0.18) * 1.4;
      saturnRef.current.position.z = -8 + Math.sin(t * 0.2) * 1.8;
      saturnRef.current.rotation.y += 0.004;
    }
  });

  return (
    <>
      {sun ? <CelestialBodyMesh body={sun} radius={2.8} presentation="hero" /> : null}

      {earth ? (
        <group ref={earthRef} position={[5, 0.4, 4]}>
          <CelestialBodyMesh body={earth} radius={1.1} presentation="hero" />
        </group>
      ) : null}

      {jupiter ? (
        <group ref={jupiterRef} position={[9, 0, -4]}>
          <CelestialBodyMesh body={jupiter} radius={1.8} presentation="hero" />
        </group>
      ) : null}

      {saturn ? (
        <group ref={saturnRef} position={[-11, 0.2, -8]}>
          <CelestialBodyMesh body={saturn} radius={1.55} presentation="hero" />
        </group>
      ) : null}
    </>
  );
}

export function HeroScene({ bodies }: { bodies: Body[] }) {
  return (
    <div className="absolute inset-0">
      <Canvas
        dpr={[1, 2]}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 4, 20]} fov={42} />
        <color attach="background" args={["#02040a"]} />
        <fog attach="fog" args={["#02040a", 14, 48]} />
        <ambientLight intensity={0.12} />
        <pointLight position={[0, 0, 0]} intensity={182} color="#f59e0b" />
        <pointLight position={[11, 9, 18]} intensity={12} color="#a5f3fc" />
        <pointLight position={[-17, 5, -12]} intensity={4.8} color="#f8fafc" />
        <pointLight position={[0, -8, 14]} intensity={2.2} color="#fde68a" />
        <Stars radius={200} depth={120} count={5000} factor={3.2} saturation={0} fade speed={0.5} />
        <Suspense fallback={null}>
          <HeroBodies bodies={bodies} />
        </Suspense>
      </Canvas>
    </div>
  );
}

"use client";

import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Group,
  Mesh,
  ShaderMaterial,
  Texture,
} from "three";
import {
  AdditiveBlending,
  BackSide,
  Color,
  DoubleSide,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";

import type { Body, PlanetAppearanceMaps, PlanetAppearanceProfile } from "@/types";

import {
  getAppearanceShapeSourceSummary,
  getPlanetAppearanceProfile,
  getPlanetQualityTier,
  listBundledAppearanceMaps,
  type PlanetPresentationTier,
} from "@/lib/appearance/planet-appearance";

import { getBodyColor } from "./scene-style";

const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(cameraPosition - worldPosition.xyz);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const atmosphereFragmentShader = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;

  varying vec3 vNormal;
  varying vec3 vViewDirection;

  void main() {
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDirection)), 0.0), uPower);
    gl_FragColor = vec4(uColor, fresnel * uIntensity);
  }
`;

const sunVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sunFragmentShader = `
  uniform float uTime;
  uniform float uGlow;

  varying vec2 vUv;
  varying vec3 vNormal;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.05;
      amplitude *= 0.53;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    float n = fbm(uv * 8.0 + vec2(uTime * 0.08, -uTime * 0.04));
    float pulse = sin((uv.y + uTime * 0.04) * 30.0) * 0.5 + 0.5;
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0), 1.5);
    vec3 inner = vec3(1.0, 0.74, 0.2);
    vec3 middle = vec3(1.0, 0.46, 0.08);
    vec3 outer = vec3(1.0, 0.9, 0.45);
    vec3 color = mix(inner, middle, n);
    color = mix(color, outer, pulse * 0.18 + fresnel * 0.22);
    gl_FragColor = vec4(color, 1.0 + fresnel * uGlow);
  }
`;

const nightLightsVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const nightLightsFragmentShader = `
  uniform sampler2D uMap;
  uniform vec3 uLightDirection;
  uniform float uIntensity;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    float lightDot = dot(normalize(vWorldNormal), normalize(uLightDirection));
    float nightMask = smoothstep(0.18, -0.12, lightDot);
    float alpha = tex.a * nightMask * uIntensity;
    gl_FragColor = vec4(tex.rgb * (0.6 + nightMask * 0.4), alpha);
  }
`;

type Presentation = PlanetPresentationTier;

function getSegments(presentation: Presentation) {
  switch (presentation) {
    case "detail":
      return 128;
    case "hero":
      return 96;
    case "system":
      return 56;
    case "overview":
    default:
      return 44;
  }
}

function getRotationSpeed(body: Body) {
  if (body.id === "sun") {
    return 0.0012;
  }

  const period = body.rotationPeriodHours ?? 48;
  const direction = period < 0 ? -1 : 1;
  const normalized = Math.max(0.0004, Math.min(0.012, 0.08 / Math.abs(period)));
  return normalized * direction;
}

function useSceneTextureMobileMode() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return mobile;
}

function useAppearanceTextures(
  profile: PlanetAppearanceProfile,
  presentation: Presentation,
) {
  const mobile = useSceneTextureMobileMode();
  const quality = getPlanetQualityTier(profile, presentation, mobile);
  const entries = useMemo(
    () => listBundledAppearanceMaps(profile, quality),
    [profile, quality],
  );
  const paths = useMemo(() => entries.map(([, value]) => value), [entries]);
  const loaded = useTexture(paths);

  return useMemo(() => {
    const maps: Partial<Record<keyof PlanetAppearanceMaps, Texture>> = {};

    entries.forEach(([key], index) => {
      const sourceTexture = loaded[index];
      if (!sourceTexture) {
        return;
      }

      const texture = sourceTexture.clone();

      if (
        key === "albedo" ||
        key === "emissive" ||
        key === "clouds" ||
        key === "nightLights" ||
        key === "ringColor"
      ) {
        texture.colorSpace = SRGBColorSpace;
      }

      texture.needsUpdate = true;
      maps[key as keyof PlanetAppearanceMaps] = texture;
    });

    return maps;
  }, [entries, loaded]);
}

function AtmosphereShell({
  radius,
  color,
  intensity,
  fresnelPower,
}: {
  radius: number;
  color: string;
  intensity: number;
  fresnelPower: number;
}) {
  const uniforms = useMemo(
    () => ({
      uColor: { value: new Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: fresnelPower },
    }),
    [color, fresnelPower, intensity],
  );

  return (
    <mesh scale={1.05}>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        side={BackSide}
      />
    </mesh>
  );
}

function NightLightsShell({
  radius,
  map,
  intensity,
}: {
  radius: number;
  map: Texture;
  intensity: number;
}) {
  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uLightDirection: { value: new Vector3(1.15, 0.2, 0.55).normalize() },
      uIntensity: { value: intensity },
    }),
    [intensity, map],
  );

  return (
    <mesh scale={1.006}>
      <sphereGeometry args={[radius, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={nightLightsVertexShader}
        fragmentShader={nightLightsFragmentShader}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}

function OceanSpecularShell({
  radius,
  specularMap,
}: {
  radius: number;
  specularMap: Texture;
}) {
  return (
    <mesh scale={1.001}>
      <sphereGeometry args={[radius, 72, 72]} />
      <meshPhongMaterial
        color="#0b1220"
        transparent
        opacity={0.18}
        depthWrite={false}
        specular="#9cd8ff"
        shininess={110}
        specularMap={specularMap}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}

function SunBody({ radius }: { radius: number }) {
  const ref = useRef<Mesh>(null);
  const materialRef = useRef<ShaderMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      const timeUniform = materialRef.current.uniforms.uTime;
      if (timeUniform && typeof timeUniform.value === "number") {
        timeUniform.value = state.clock.getElapsedTime();
      }
    }

    if (ref.current) {
      ref.current.rotation.y += 0.001;
    }
  });

  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[radius, 80, 80]} />
        <shaderMaterial
          ref={materialRef}
          uniforms={{
            uTime: { value: 0 },
            uGlow: { value: 0.8 },
          }}
          vertexShader={sunVertexShader}
          fragmentShader={sunFragmentShader}
        />
      </mesh>
      <mesh scale={1.13}>
        <sphereGeometry args={[radius, 48, 48]} />
        <meshBasicMaterial
          color="#ffcf6b"
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <AtmosphereShell
        radius={radius}
        color="#ffb347"
        intensity={0.75}
        fresnelPower={1.8}
      />
    </group>
  );
}

function RingSystem({
  radius,
  colorMap,
  alphaMap,
  roughnessMap,
}: {
  radius: number;
  colorMap?: Texture;
  alphaMap?: Texture;
  roughnessMap?: Texture;
}) {
  return (
    <mesh rotation={[Math.PI / 2.72, 0.12, 0]}>
      <ringGeometry args={[radius * 1.55, radius * 2.65, 128]} />
      <meshStandardMaterial
        map={colorMap}
        alphaMap={alphaMap}
        roughnessMap={roughnessMap}
        transparent
        opacity={0.92}
        side={DoubleSide}
        roughness={0.82}
        metalness={0.02}
        depthWrite={false}
      />
    </mesh>
  );
}

function ProceduralFallbackBody({
  body,
  radius,
}: {
  body: Body;
  radius: number;
}) {
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += getRotationSpeed(body);
    }
  });

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 48, 48]} />
      <meshStandardMaterial
        color={getBodyColor(body)}
        emissive={body.id === "sun" ? "#f59e0b" : getBodyColor(body)}
        emissiveIntensity={body.id === "sun" ? 0.65 : 0.08}
        roughness={0.86}
        metalness={0.04}
      />
    </mesh>
  );
}

function PlanetSphere({
  body,
  profile,
  radius,
  presentation,
}: {
  body: Body;
  profile: PlanetAppearanceProfile;
  radius: number;
  presentation: Presentation;
}) {
  const rootRef = useRef<Group>(null);
  const cloudRef = useRef<Mesh>(null);
  const segments = getSegments(presentation);
  const textures = useAppearanceTextures(profile, presentation);
  const normalScale = useMemo(
    () => new Vector2(profile.material.normalScale, profile.material.normalScale),
    [profile.material.normalScale],
  );
  useFrame(() => {
    if (rootRef.current) {
      rootRef.current.rotation.y += getRotationSpeed(body);
    }

    if (cloudRef.current && profile.material.cloudSpeed > 0) {
      cloudRef.current.rotation.y += profile.material.cloudSpeed;
    }
  });

  const axialTilt = ((profile.geometry.axialTiltDeg ?? 0) * Math.PI) / 180;

  if (profile.renderMode === "star") {
    return (
      <group rotation={[0, 0, axialTilt]}>
        <SunBody radius={radius} />
      </group>
    );
  }

  return (
    <group rotation={[0, 0, axialTilt]}>
      <group ref={rootRef}>
        <mesh>
          <sphereGeometry args={[radius, segments, segments]} />
          <meshStandardMaterial
            color="#ffffff"
            map={textures.albedo}
            normalMap={textures.normal}
            normalScale={textures.normal ? normalScale : undefined}
            bumpMap={textures.bump}
            bumpScale={textures.normal ? 0 : profile.material.bumpScale}
            roughnessMap={textures.roughness}
            roughness={profile.material.roughness}
            metalness={profile.material.metalness}
            metalnessMap={textures.specular}
            emissiveMap={textures.emissive}
            emissive={
              textures.emissive
                ? new Color("#ffbb66")
                : new Color("#000000")
            }
            emissiveIntensity={profile.material.emissiveIntensity}
          />
        </mesh>

        {textures.specular && body.id === "earth" ? (
          <OceanSpecularShell radius={radius} specularMap={textures.specular} />
        ) : null}

        {textures.nightLights ? (
          <NightLightsShell
            radius={radius}
            map={textures.nightLights}
            intensity={profile.material.emissiveIntensity}
          />
        ) : null}

        {textures.clouds && presentation !== "overview" ? (
          <>
            <mesh scale={1.006}>
              <sphereGeometry args={[radius, Math.max(36, segments - 10), Math.max(36, segments - 10)]} />
              <meshStandardMaterial
                map={textures.clouds}
                color="#0f172a"
                transparent
                opacity={profile.renderMode === "gas_giant" ? 0.08 : 0.12}
                depthWrite={false}
              />
            </mesh>
            <mesh ref={cloudRef} scale={1.015}>
            <sphereGeometry args={[radius, Math.max(40, segments - 8), Math.max(40, segments - 8)]} />
            <meshStandardMaterial
              map={textures.clouds}
              color="#ffffff"
              transparent
              opacity={profile.renderMode === "gas_giant" ? 0.52 : 0.66}
              roughness={0.88}
              metalness={0}
              depthWrite={false}
            />
            </mesh>
          </>
        ) : null}

        {profile.material.atmosphereIntensity > 0 ? (
          <AtmosphereShell
            radius={radius}
            color={profile.material.atmosphereColor}
            intensity={profile.material.atmosphereIntensity}
            fresnelPower={profile.material.fresnelPower}
          />
        ) : null}

        {textures.ringColor && textures.ringAlpha ? (
          <RingSystem
            radius={radius}
            colorMap={textures.ringColor}
            alphaMap={textures.ringAlpha}
            roughnessMap={textures.ringRoughness}
          />
        ) : null}
      </group>
    </group>
  );
}

export function CelestialBodyMesh({
  body,
  radius,
  presentation,
}: {
  body: Body;
  radius: number;
  presentation: Presentation;
}) {
  const profile = getPlanetAppearanceProfile(body.id);

  if (!profile) {
    return <ProceduralFallbackBody body={body} radius={radius} />;
  }

  return (
    <PlanetSphere
      body={body}
      profile={profile}
      radius={radius}
      presentation={presentation}
    />
  );
}

export function getVisualShapeSource(body: Body) {
  return getAppearanceShapeSourceSummary(body.id, body.shapeSource);
}

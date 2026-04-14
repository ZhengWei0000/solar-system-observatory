import { describe, expect, it } from "vitest";

import {
  getBodyBySlug,
  getOrbitResponse,
  getSystemBySlug,
  searchBodies,
} from "@/lib/data/repository";

describe("repository", () => {
  it("returns required featured body entries", async () => {
    const earth = await getBodyBySlug("earth");
    const titan = await getBodyBySlug("titan");

    expect(earth?.englishName).toBe("Earth");
    expect(titan?.englishName).toBe("Titan");
  });

  it("returns system payload with members", async () => {
    const jupiter = await getSystemBySlug("jupiter");

    expect(jupiter?.primary?.id).toBe("jupiter");
    expect(jupiter?.members.length).toBeGreaterThan(20);
  });

  it("searches by english and chinese names", async () => {
    const europa = await searchBodies("Europa");
    const charon = await searchBodies("冥卫一");

    expect(europa[0]?.slug).toBe("europa");
    expect(charon.some((item) => item.slug === "charon")).toBe(true);
  });

  it("returns orbit response metadata for preset-based caches", async () => {
    const earthOrbit = await getOrbitResponse("earth", "overview-current");

    expect(earthOrbit.status).toBe("ok");
    expect(earthOrbit.preset).toBe("overview-current");
    expect(earthOrbit.coverage?.sampleStart).toBeTruthy();
  });
});

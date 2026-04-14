import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { GET as getBody } from "@/app/api/bodies/[slug]/route";
import { GET as getOrbit } from "@/app/api/orbits/route";
import { GET as getSearch } from "@/app/api/search/route";
import { GET as getSystem } from "@/app/api/systems/[slug]/route";

describe("api smoke tests", () => {
  it("returns a featured body by slug", async () => {
    const response = await getBody(new Request("http://localhost/api/bodies/earth"), {
      params: Promise.resolve({ slug: "earth" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.item.slug).toBe("earth");
  });

  it("returns a system payload", async () => {
    const response = await getSystem(new Request("http://localhost/api/systems/jupiter"), {
      params: Promise.resolve({ slug: "jupiter" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.system.slug).toBe("jupiter");
  });

  it("returns search matches", async () => {
    const response = await getSearch(
      new NextRequest("http://localhost/api/search?q=Titan"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.items.some((item: { slug: string }) => item.slug === "titan")).toBe(true);
  });

  it("returns orbit response metadata", async () => {
    const response = await getOrbit(
      new NextRequest("http://localhost/api/orbits?bodyId=earth"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.requested.bodyId).toBe("earth");
    expect(["ok", "missing"]).toContain(payload.status);
  });
});

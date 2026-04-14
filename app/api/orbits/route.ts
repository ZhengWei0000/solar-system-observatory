import { NextRequest, NextResponse } from "next/server";

import { getOrbitResponse } from "@/lib/data/repository";
import type { OrbitPreset } from "@/types";

export async function GET(request: NextRequest) {
  const bodyId = request.nextUrl.searchParams.get("bodyId");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const step = request.nextUrl.searchParams.get("step");
  const preset = (request.nextUrl.searchParams.get("preset") ?? "auto") as OrbitPreset | "auto";

  if (!bodyId) {
    return NextResponse.json({ error: "bodyId is required" }, { status: 400 });
  }

  const orbit = await getOrbitResponse(bodyId, preset);

  return NextResponse.json({
    ...orbit,
    requested: { bodyId, from, to, step, preset },
  });
}

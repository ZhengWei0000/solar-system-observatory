import { NextRequest, NextResponse } from "next/server";

import { searchBodies } from "@/lib/data/repository";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const items = await searchBodies(query);

  return NextResponse.json({ items, query });
}

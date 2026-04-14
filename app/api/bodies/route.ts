import { NextResponse } from "next/server";

import { getBodies } from "@/lib/data/repository";

export async function GET() {
  const items = await getBodies();
  return NextResponse.json({ items });
}

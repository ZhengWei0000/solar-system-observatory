import { NextResponse } from "next/server";

import { getSystemBySlug } from "@/lib/data/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const item = await getSystemBySlug(slug);

  if (!item) {
    return NextResponse.json({ error: "System not found" }, { status: 404 });
  }

  return NextResponse.json(item);
}

import { NextResponse } from "next/server";

import { getBodyBySlug } from "@/lib/data/repository";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const item = await getBodyBySlug(slug);

  if (!item) {
    return NextResponse.json({ error: "Body not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

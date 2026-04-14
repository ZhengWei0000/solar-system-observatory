import { NextResponse } from "next/server";

export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return NextResponse.json({
    ok: true,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
    siteUrl,
    deployTime: new Date().toISOString(),
    deployment: {
      region: process.env.VERCEL_REGION ?? null,
      url: process.env.VERCEL_URL ?? null,
      commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    },
  });
}

import type { MetadataRoute } from "next";

import { getBodies, getSystems } from "@/lib/data/repository";

const defaultSiteUrl = "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? defaultSiteUrl;
  const [systems, bodies] = await Promise.all([getSystems(), getBodies()]);

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/solar-system`,
      lastModified: new Date().toISOString(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/learn`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/sources`,
      lastModified: new Date().toISOString(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const systemEntries: MetadataRoute.Sitemap = systems.map((system) => ({
    url: `${siteUrl}/system/${system.slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "monthly",
    priority: 0.65,
  }));

  const bodyEntries: MetadataRoute.Sitemap = bodies.map((body) => ({
    url: `${siteUrl}/body/${body.slug}`,
    lastModified: body.lastSyncedAt,
    changeFrequency: "monthly",
    priority: body.featured ? 0.75 : 0.55,
  }));

  return [...staticEntries, ...systemEntries, ...bodyEntries];
}

/**
 * Builds a local JSON search index for the MVP search experience.
 */
import path from "node:path";

import { loadNormalizedBodiesSnapshot, loadNormalizedSystemsSnapshot } from "./catalog-pipeline";
import { logStep, writeJsonFile } from "./utils";

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]+/g, " ").trim();
}

async function main() {
  const [bodies, systems] = await Promise.all([
    loadNormalizedBodiesSnapshot(),
    loadNormalizedSystemsSnapshot(),
  ]);
  const systemById = new Map(systems.map((system) => [system.id, system]));

  const items = bodies.map((body) => {
    const system = body.systemId ? systemById.get(body.systemId) : null;
    const names = [body.chineseName, body.englishName, body.officialName];
    const systemNames = system
      ? [system.name, system.chineseName, system.slug]
      : [];

    const tokens = [...names, ...body.aliases, ...systemNames]
      .map(normalizeToken)
      .flatMap((token) => token.split(/\s+/))
      .filter(Boolean);

    return {
      id: body.id,
      slug: body.slug,
      names,
      aliases: body.aliases,
      systemNames,
      bodyType: body.bodyType,
      modelGrade: body.modelGrade,
      descriptionOneLine: body.descriptionOneLine,
      systemSlug: system?.slug ?? null,
      tokens,
    };
  });

  await writeJsonFile(path.join(process.cwd(), "data", "generated", "search-index.json"), items);
  logStep(`Wrote search index with ${items.length} entries`);
}

main().catch((error) => {
  process.stderr.write(`\n[solar-system-observatory:error] buildSearchIndex failed: ${String(error)}\n`);
  process.exit(1);
});

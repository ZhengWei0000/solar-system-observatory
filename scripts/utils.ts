import { promises as fs } from "node:fs";
import path from "node:path";

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export async function readTextFile(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function writeAtomicFile(filePath: string, data: string) {
  await ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, data, "utf8");
  await fs.rename(tempPath, filePath);
}

async function writeAtomicBinaryFile(filePath: string, data: Uint8Array | Buffer) {
  await ensureDir(path.dirname(filePath));
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, data);
  await fs.rename(tempPath, filePath);
}

export async function writeJsonFile(filePath: string, data: unknown) {
  await writeAtomicFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export async function writeTextFile(filePath: string, data: string) {
  await writeAtomicFile(filePath, data);
}

export async function writeBinaryFile(filePath: string, data: Uint8Array | Buffer) {
  await writeAtomicBinaryFile(filePath, data);
}

export async function fetchText(url: string, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "solar-system-observatory/0.2 (codex sync pipeline)",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${url} with status ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson<T>(url: string, timeoutMs = 30_000) {
  const text = await fetchText(url, timeoutMs);
  return JSON.parse(text) as T;
}

export async function fetchBinary(url: string, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "solar-system-observatory/0.2 (codex sync pipeline)",
      },
    });

    if (!response.ok) {
      throw new Error(`Request failed for ${url} with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}

export function logStep(message: string) {
  process.stdout.write(`\n[solar-system-observatory] ${message}\n`);
}

export function logWarning(message: string) {
  process.stderr.write(`\n[solar-system-observatory:warning] ${message}\n`);
}

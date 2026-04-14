#!/usr/bin/env node
/* eslint-disable no-console */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const process = require("node:process");

const HOST = "127.0.0.1";
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;

const root = process.cwd();

function exists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

function resolveNextBin() {
  const direct = path.join(root, "node_modules", "next", "dist", "bin", "next");
  if (exists(direct)) {
    return { command: process.execPath, args: [direct] };
  }
  const asBin = process.platform === "win32"
    ? path.join(root, "node_modules", ".bin", "next.cmd")
    : path.join(root, "node_modules", ".bin", "next");
  if (exists(asBin)) {
    return { command: asBin, args: [] };
  }
  throw new Error("Unable to locate next executable. Run pnpm install first.");
}

function resolveElectronBin() {
  const asBin = process.platform === "win32"
    ? path.join(root, "node_modules", ".bin", "electron.cmd")
    : path.join(root, "node_modules", ".bin", "electron");
  if (exists(asBin)) {
    return { command: asBin, args: ["."] };
  }
  const cli = path.join(root, "node_modules", "electron", "cli.js");
  if (exists(cli)) {
    return { command: process.execPath, args: [cli, "."] };
  }
  throw new Error("Unable to locate electron executable. Run pnpm install first.");
}

const nextCommand = resolveNextBin();
const electronCommand = resolveElectronBin();

console.log(`Starting Next dev server at ${BASE_URL} ...`);
const nextProcess = spawn(nextCommand.command, [...nextCommand.args, "dev", "--hostname", HOST, "--port", String(PORT)], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SITE_URL: BASE_URL,
  },
});

const wait = async () => {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const ok = await fetch(`${BASE_URL}/api/health`).then((r) => r.ok);
      if (ok) {
        return;
      }
    } catch {
      // retry
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error("next dev did not become healthy in time.");
};

wait().then(() => {
  console.log("Starting Electron client...");
  const electronProcess = spawn(electronCommand.command, electronCommand.args, {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      ELECTRON_OPEN_DEVTOOLS: process.env.ELECTRON_OPEN_DEVTOOLS || "0",
      NEXT_PUBLIC_SITE_URL: BASE_URL,
    },
  });

  const stop = () => {
    if (!electronProcess.killed) {
      electronProcess.kill();
    }
    if (!nextProcess.killed) {
      nextProcess.kill();
    }
  };

  electronProcess.on("exit", stop);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  process.on("exit", stop);
}).catch((error) => {
  console.error(String(error));
  if (!nextProcess.killed) {
    nextProcess.kill();
  }
  process.exit(1);
});

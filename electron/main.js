const { app, BrowserWindow, dialog } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const process = require("node:process");

const HOST = "127.0.0.1";
const PORT = 4173;
const BASE_URL = `http://${HOST}:${PORT}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function appRootPath() {
  if (!app.isPackaged) {
    return process.cwd();
  }
  const current = app.getAppPath();
  if (current.endsWith(".asar")) {
    return path.dirname(current);
  }
  return current;
}

function resolveLogPath() {
  const logDir = path.join(app.getPath("userData"), "logs");
  fs.mkdirSync(logDir, { recursive: true });
  return path.join(logDir, "app.log");
}

function appendLog(logFile, message) {
  const now = new Date().toISOString();
  fs.appendFileSync(logFile, `[${now}] ${message}\n`);
}

async function isHealthy() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/api/health`, {
      headers: { "Accept": "application/json" },
      timeout: 1000,
    }, (res) => {
      res.resume();
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });

    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy(new Error("health timeout"));
      resolve(false);
    });
  });
}

async function waitForHealth(checkTimeoutMs = 120000) {
  const stepMs = 500;
  const deadline = Date.now() + checkTimeoutMs;
  while (Date.now() < deadline) {
    if (await isHealthy()) {
      return true;
    }
    await delay(stepMs);
  }
  return false;
}

function resolveNextEntry() {
  const root = appRootPath();
  const nextModule = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const nextCmd = path.join(root, "node_modules", ".bin", "next");
  if (fs.existsSync(nextModule)) {
    return { command: process.execPath, args: [nextModule, "start", "--hostname", HOST, "--port", String(PORT)] };
  }
  if (fs.existsSync(nextCmd)) {
    return { command: nextCmd, args: ["start", "--hostname", HOST, "--port", String(PORT)] };
  }
  throw new Error(`Unable to locate Next.js executable in ${root}`);
}

let nextProcess = null;

async function startServer() {
  const root = appRootPath();
  const logFile = resolveLogPath();
  const env = {
    ...process.env,
    NODE_ENV: "production",
    NEXT_PUBLIC_SITE_URL: BASE_URL,
    // Desktop mode forces deterministic route behavior; never attempt to write files outside AppData
    SOLAR_SYSTEM_ELECTRON_MODE: "desktop",
  };
  const { command, args } = resolveNextEntry();

  appendLog(logFile, `Starting Next.js: ${command} ${args.join(" ")}`);
  nextProcess = spawn(command, args, {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  nextProcess.stdout.on("data", (chunk) => appendLog(logFile, `nextout: ${chunk.toString().trim()}`));
  nextProcess.stderr.on("data", (chunk) => appendLog(logFile, `nexterr: ${chunk.toString().trim()}`));

  nextProcess.on("exit", (code, signal) => {
    appendLog(logFile, `Next.js process exited with code=${code} signal=${signal}`);
  });

  const ok = await waitForHealth();
  if (!ok) {
    throw new Error(`Next.js did not become healthy on ${BASE_URL}`);
  }

  return true;
}

async function ensureServer() {
  const healthy = await isHealthy();
  if (healthy) {
    return;
  }
  await startServer();
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: "#050816",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(`${BASE_URL}/`);
  mainWindow.setTitle("Solar System Observatory");

  mainWindow.webContents.on("did-fail-load", async () => {
    const failed = await isHealthy().catch(() => false);
    if (!failed) {
      dialog.showErrorBox("启动失败", `本地站点未在 ${BASE_URL} 正常响应，请查看日志: ${resolveLogPath()}`);
    }
  });

  return mainWindow;
}

function stopServer() {
  if (!nextProcess) {
    return;
  }
  const proc = nextProcess;
  nextProcess = null;
  if (proc.killed) {
    return;
  }
  proc.removeAllListeners("exit");
  proc.on("exit", () => {});
  try {
    proc.kill("SIGINT");
  } catch {
    proc.kill();
  }
}

app.whenReady()
  .then(async () => {
    try {
      await ensureServer();
      const mainWindow = createWindow();

      if (process.platform === "darwin") {
        app.on("activate", () => {
          if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
          }
        });
      }

      if (process.env.ELECTRON_OPEN_DEVTOOLS === "1") {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      }
    } catch (error) {
      const logFile = resolveLogPath();
      appendLog(logFile, `Startup failed: ${String(error)}`);
      dialog.showErrorBox("启动失败", `${String(error)}\n日志: ${logFile}`);
      app.quit();
    }
  })
  .catch((error) => {
    const logFile = resolveLogPath();
    if (fs.existsSync(path.dirname(logFile))) {
      appendLog(logFile, `whenReady failed: ${String(error)}`);
    }
    dialog.showErrorBox("启动失败", String(error));
    app.quit();
  });

app.on("window-all-closed", () => {
  stopServer();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopServer();
});

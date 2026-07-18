/**
 * Global setup for E2E tests.
 * Starts the Vite dev server before all tests.
 * Must export a single default function.
 */

import { spawn, execSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { readFileSync, existsSync } from "node:fs";
import { resolve as pathResolve } from "node:path";

/**
 * Load environment variables from .env file (if exists).
 * This allows the user to place PIXIV_REFRESH_TOKEN in .env without polluting
 * the shell environment.
 */
function loadEnvFile(): void {
  const envPath = pathResolve(new URL("../../.env", import.meta.url).pathname);
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) {
      continue;
    }
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key && value && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const DEV_SERVER_PORT = 5173;

// Store the server process globally so globalTeardown can access it
(globalThis as any).e2eServerProcess = null as ChildProcess | null;

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createServer();
    s.once("error", () => resolve(true));
    s.once("listening", () => {
      s.close();
      resolve(false);
    });
    s.listen(port);
  });
}

/**
 * Kill any process listening on the given port using lsof + kill.
 * No-op if nothing is listening.
 */
function killProcessOnPort(port: number): void {
  try {
    const pid = execSync(`lsof -ti :${port}`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    if (pid) {
      execSync(`kill -9 ${pid}`, { timeout: 3000 });
      console.log(`[E2E] Killed existing process on port ${port} (PID ${pid})`);
    }
  } catch {
    // Nothing listening or lsof not available
  }
}

async function waitForServer(url: string, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) {
        return;
      }
    } catch {
      /* Retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Dev server did not start within ${timeoutMs}ms`);
}

export default async function globalSetup(): Promise<void> {
  console.log("[E2E] Starting global setup...");

  // Load .env file if present (before checking token)
  loadEnvFile();

  if (!process.env.PIXIV_REFRESH_TOKEN) {
    console.warn("[E2E] PIXIV_REFRESH_TOKEN not set. Login tests will be skipped.");
  }

  // Check if port is in use and if so, verify it's a live Vite server
  if (await isPortInUse(DEV_SERVER_PORT)) {
    try {
      const res = await fetch(`http://localhost:${DEV_SERVER_PORT}`);
      if (res.ok || res.status === 404) {
        console.log(`[E2E] Existing Vite server found on port ${DEV_SERVER_PORT}, reusing`);
        return; // Reuse existing server
      }
    } catch {
      // Port is in use but not responding — stale process. Kill it.
      console.log(`[E2E] Port ${DEV_SERVER_PORT} in use but not responding, killing...`);
      killProcessOnPort(DEV_SERVER_PORT);
      // Wait for port to be released
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`[E2E] Starting Vite dev server on port ${DEV_SERVER_PORT}...`);

  const proc = spawn("pnpm", ["dev", "--port", String(DEV_SERVER_PORT)], {
    cwd: new URL("../..", import.meta.url).pathname,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    shell: true,
  });

  (globalThis as any).e2eServerProcess = proc;

  proc.stdout?.on("data", (d: Buffer) => {
    if (process.env.DEBUG) {
      process.stdout.write(`[vite] ${d.toString()}`);
    }
  });
  proc.stderr?.on("data", (d: Buffer) => {
    if (process.env.DEBUG) {
      process.stderr.write(`[vite:err] ${d.toString()}`);
    }
  });
  proc.on("exit", (code) => {
    if (code && process.env.DEBUG) {
      console.log(`[E2E] Vite exited with code ${code}`);
    }
    (globalThis as any).e2eServerProcess = null;
  });

  await waitForServer(`http://localhost:${DEV_SERVER_PORT}`);
  console.log("[E2E] Dev server is ready");
}

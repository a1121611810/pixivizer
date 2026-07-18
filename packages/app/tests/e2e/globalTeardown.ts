/**
 * Global teardown for E2E tests.
 * Kills the Vite dev server started by globalSetup.
 * Must export a single default function.
 */

export default async function globalTeardown(): Promise<void> {
  const proc = (globalThis as any).e2eServerProcess;
  if (proc) {
    console.log("[E2E] Shutting down dev server...");
    proc.kill("SIGTERM");
    (globalThis as any).e2eServerProcess = null;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

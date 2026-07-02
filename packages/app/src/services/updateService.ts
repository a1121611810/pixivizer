/**
 * In-app update check service.
 *
 * Fetches the latest stable release from GitHub and compares
 * version numbers to determine if an update is available.
 */

// APP_VERSION is a global constant injected at build time via Vite's define.
// It is declared in src/types/env.d.ts.

// ── Types ──

export interface CheckResult {
  hasUpdate: boolean;
  latestVersion: string;
  latestReleaseUrl: string;
  latestChangelog: string;
}

// ── State ──

let cachedResult: CheckResult | null = null;

// ── Version comparison (no semver dependency) ──

/**
 * Compare two version strings numerically.
 * Returns true if `remote` is newer than `local`.
 * Handles optional leading "v" prefix on remote.
 */
export function isNewer(local: string, remote: string): boolean {
  const lParts = local.split(".").map(Number);
  const rParts = remote.replace(/^v/, "").split(".").map(Number);

  // Compare up to major.minor.patch (standard semver, 3 parts max)
  for (let i = 0; i < 3; i++) {
    const l = lParts[i] ?? 0;
    const r = rParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false; // equal
}

// ── Core fetch ──

// 通过 raw.githubusercontent.com 获取版本信息（不被代理拦截）
const UPDATE_URL =
  "https://raw.githubusercontent.com/a1121611810/pixivizer/main/packages/website/version.json";

/**
 * Fetch the latest stable release from GitHub and compare
 * against the current app version.
 *
 * All errors are silently caught — returns a safe default
 * so callers never need to handle exceptions.
 */
export async function checkForUpdate(): Promise<CheckResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(UPDATE_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[updateService] version.json 返回 ${res.status}`);
      return cachedResult ?? noUpdateResult();
    }

    const data = await res.json();

    const hasUpdate = isNewer(APP_VERSION, data.version);

    const result: CheckResult = {
      hasUpdate,
      latestVersion: String(data.version || "").replace(/^v/, ""),
      latestReleaseUrl: data.url || "",
      latestChangelog: data.changelog || "",
    };

    cachedResult = result;
    return result;
  } catch (err) {
    console.warn("[updateService] 异常:", err);
    return cachedResult ?? noUpdateResult();
  }
}

/**
 * Get the last cached check result, or null if never checked.
 */
export function getCachedResult(): CheckResult | null {
  return cachedResult;
}

/**
 * Reset cached state (useful for testing).
 */
export function resetCache(): void {
  cachedResult = null;
}

// ── Helpers ──

function noUpdateResult(): CheckResult {
  return {
    hasUpdate: false,
    latestVersion: "",
    latestReleaseUrl: "",
    latestChangelog: "",
  };
}

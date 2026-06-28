/**
 * In-app update check service.
 *
 * Fetches the latest stable release from GitHub and compares
 * version numbers to determine if an update is available.
 */

// APP_VERSION is a global constant injected at build time via Vite's define.
// It is declared in src/types/env.d.ts.

// ── Types ──

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body: string;
  published_at: string;
  prerelease: boolean;
}

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
function isNewer(local: string, remote: string): boolean {
  const lParts = local.split(".").map(Number);
  const rParts = remote.replace(/^v/, "").split(".").map(Number);

  for (let i = 0; i < 3; i++) {
    const l = lParts[i] ?? 0;
    const r = rParts[i] ?? 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false; // equal
}

// ── Core fetch ──

const GITHUB_API_URL =
  "https://api.github.com/repos/a1121611810/pixivizer/releases/latest";

/**
 * Fetch the latest stable release from GitHub and compare
 * against the current app version.
 *
 * All errors are silently caught — returns a safe default
 * so callers never need to handle exceptions.
 */
export async function checkForUpdate(): Promise<CheckResult> {
  try {
    const res = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": `Pictelio/${APP_VERSION}`,
      },
    });

    if (!res.ok) {
      console.warn(
        `[updateService] GitHub API responded with ${res.status}`,
      );
      return cachedResult ?? noUpdateResult();
    }

    const release: GitHubRelease = await res.json();

    // Skip pre-releases
    if (release.prerelease) {
      console.warn(
        `[updateService] Latest release is a pre-release, skipping`,
      );
      return cachedResult ?? noUpdateResult();
    }

    const hasUpdate = isNewer(APP_VERSION, release.tag_name);
    const result: CheckResult = {
      hasUpdate,
      latestVersion: release.tag_name.replace(/^v/, ""),
      latestReleaseUrl: release.html_url,
      latestChangelog: release.body || "",
    };

    cachedResult = result;
    return result;
  } catch (err) {
    console.warn("[updateService] Failed to check for update:", err);
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

/**
 * Attempt to load PIXIV_REFRESH_TOKEN from the user's shell profile
 * if it's not already set in the environment.
 *
 * This handles the case where the test runner (non-interactive shell)
 * doesn't source ~/.zshrc or ~/.bashrc where the token may be exported.
 */
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROFILE_FILES = [".zshrc", ".zprofile", ".bashrc", ".bash_profile", ".profile"];

/**
 * Parse a shell profile file and extract the value of PIXIV_REFRESH_TOKEN.
 * Supports:
 *   export PIXIV_REFRESH_TOKEN="value"
 *   export PIXIV_REFRESH_TOKEN='value'
 *   export PIXIV_REFRESH_TOKEN=value
 *   PIXIV_REFRESH_TOKEN="value"
 */
function extractTokenFromProfile(content: string): string | null {
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Skip comments
    if (trimmed.startsWith("#")) continue;

    // Match: export PIXIV_REFRESH_TOKEN="..." or ='...' or =...
    const match = trimmed.match(
      /^(?:export\s+)?PIXIV_REFRESH_TOKEN\s*=\s*["']?([^"'\s]+)["']?\s*(?:#.*)?$/,
    );
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Read PIXIV_REFRESH_TOKEN from environment or user shell profile.
 * Returns null if not found anywhere.
 */
export function getRefreshToken(): string | null {
  // 1. Check environment first
  if (process.env.PIXIV_REFRESH_TOKEN) {
    return process.env.PIXIV_REFRESH_TOKEN;
  }

  // 2. Try reading from shell profiles
  const home = homedir();
  for (const file of PROFILE_FILES) {
    const filePath = join(home, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, "utf-8");
        const token = extractTokenFromProfile(content);
        if (token) {
          console.log(`[E2E] Loaded PIXIV_REFRESH_TOKEN from ~/${file}`);
          return token;
        }
      } catch {
        // Ignore read errors for individual files
      }
    }
  }

  return null;
}

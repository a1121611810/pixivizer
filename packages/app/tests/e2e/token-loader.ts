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
 * 尝试从 .env 文件中读取 PIXIV_REFRESH_TOKEN。
 * 支持格式：PIXIV_REFRESH_TOKEN=value（无引号或带双引号）
 * 从当前工作目录及其父级查找。
 */
function tryLoadDotEnv(): string | null {
  const searchPaths = [process.cwd()];
  // 如果项目是 monorepo 子包，尝试父级
  const parent = join(process.cwd(), "..");
  if (parent !== process.cwd()) searchPaths.push(parent);
  // 也尝试 monorepo 根目录
  searchPaths.push(join(process.cwd(), "..", ".."));

  for (const dir of searchPaths) {
    const envPath = join(dir, ".env");
    if (existsSync(envPath)) {
      try {
        const content = readFileSync(envPath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (trimmed.startsWith("#")) continue;
          const match = trimmed.match(/^PIXIV_REFRESH_TOKEN\s*=\s*"?([^"\s]+)"?\s*$/);
          if (match) {
            console.log(`[E2E] Loaded PIXIV_REFRESH_TOKEN from ${envPath}`);
            return match[1];
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }
  return null;
}

/**
 * Read PIXIV_REFRESH_TOKEN from environment or .env file or user shell profile.
 * Returns null if not found anywhere.
 */
export function getRefreshToken(): string | null {
  // 1. Check environment first
  if (process.env.PIXIV_REFRESH_TOKEN) {
    return process.env.PIXIV_REFRESH_TOKEN;
  }

  // 2. Try reading from .env file
  const fromDotEnv = tryLoadDotEnv();
  if (fromDotEnv) return fromDotEnv;

  // 3. Try reading from shell profiles
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

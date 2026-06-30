#!/usr/bin/env node

/**
 * Pictelio deploy script
 * Copies landing page files from packages/website/ to build/ for GitHub Pages.
 *
 * Usage:
 *   pnpm deploy
 */

import { cpSync, rmSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const websiteSrc = resolve(rootDir, "packages/website");
const buildDir = resolve(rootDir, "build");

// 只部署 GitHub Pages 需要的文件
const ALLOWED_FILES = new Set([
  "index.html",
  "privacy-policy.html",
  "version.json",
]);

const ALLOWED_DIRS = new Set([
  "screenshots",
]);

function log(...args) {
  console.log("[deploy]", ...args);
}

function main() {
  log("开始部署...");

  // 1. 清空 build/
  if (existsSync(buildDir)) {
    rmSync(buildDir, { recursive: true, force: true });
  }
  mkdirSync(buildDir, { recursive: true });
  log("build/ 目录已清空");

  // 2. 只复制允许的文件和目录
  const entries = readdirSync(websiteSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && ALLOWED_FILES.has(entry.name)) {
      cpSync(resolve(websiteSrc, entry.name), resolve(buildDir, entry.name));
      log(`✅ ${entry.name}`);
    } else if (entry.isDirectory() && ALLOWED_DIRS.has(entry.name)) {
      cpSync(resolve(websiteSrc, entry.name), resolve(buildDir, entry.name), { recursive: true });
      log(`✅ ${entry.name}/`);
    }
  }

  // 3. 验证关键文件
  const required = ["index.html", "version.json"];
  for (const f of required) {
    if (!existsSync(resolve(buildDir, f))) {
      console.error(`[deploy] ❌ 错误: ${f} 不存在`);
      process.exit(1);
    }
  }
  log("关键文件就绪");

  // 4. Git 提交
  try {
    execFileSync("git", ["add", "build/"], { cwd: rootDir, stdio: "inherit" });
    execFileSync("git", ["commit", "-m", "chore: update build for GitHub Pages"], {
      cwd: rootDir,
      stdio: "inherit",
    });
    log("已提交 build/");
  } catch {
    log("没有新的变更需要提交");
  }

  log("部署完成！执行 git push origin main 即可发布到 GitHub Pages");
}

main();

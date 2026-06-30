#!/usr/bin/env node

/**
 * Pictelio 本地预览脚本
 * 将 landing 页面复制到 _site/ 目录用于本地预览。
 *
 * GitHub Actions 自动部署到 Pages，此脚本仅用于本地验证。
 *
 * Usage:
 *   node scripts/deploy.mjs
 */

import { cpSync, rmSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

const websiteSrc = resolve(rootDir, "packages/website");
const outDir = resolve(rootDir, "_site");

const ALLOWED_FILES = new Set([
  "index.html",
  "privacy-policy.html",
  "version.json",
]);

const ALLOWED_DIRS = new Set([
  "screenshots",
]);

function log(...args) {
  console.log("[preview]", ...args);
}

function main() {
  log("生成本地预览 _site/ ...");

  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  const entries = readdirSync(websiteSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && ALLOWED_FILES.has(entry.name)) {
      cpSync(resolve(websiteSrc, entry.name), resolve(outDir, entry.name));
      log(`✅ ${entry.name}`);
    } else if (entry.isDirectory() && ALLOWED_DIRS.has(entry.name)) {
      cpSync(resolve(websiteSrc, entry.name), resolve(outDir, entry.name), { recursive: true });
      log(`✅ ${entry.name}/`);
    }
  }

  log("完成！推送 main 后 GitHub Actions 会自动部署。");
}

main();

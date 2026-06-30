#!/usr/bin/env node

/**
 * Pictelio 一键发布脚本
 *
 * 一条命令完成：版本号更新 → 生成 changelog → 构建 APK → GitHub Release → 上传 APK
 *
 * 用法:
 *   pnpm run release                   # 自动递增 patch 版本 (1.2.0 → 1.2.1)
 *   pnpm run release -- --patch        # 同上，显式指定递增 patch（小修复）
 *   pnpm run release -- --minor        # 递增 minor 版本 (1.2.0 → 1.3.0，新功能)
 *   pnpm run release -- --major        # 递增 major 版本 (1.2.0 → 2.0.0，大改版)
 *   pnpm run release -- --version=2.0.0   # 指定完整版本号
 *   pnpm run release -- --dry-run      # 预览模式，不实际执行
 *   pnpm run release -- --interactive   # 交互模式：手动选择提交和版本
 *   pnpm run release -i                 # 同上，简写
 *   pnpm run release -- --custom        # 自定义模式：粘贴自己的发布文案
 *   pnpm run release -c                 # 同上，简写
 *
 * 环境变量:
 *   PICTELIO_KEYSTORE_PASSWORD   - keystore 密码（必须）
 *   PICTELIO_KEY_PASSWORD        - key 密码（必须）
 */

import { readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { execFile, execFileSync } from "node:child_process";
import { resolve as resolvePath, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { createInterface } from "node:readline";

const rootDir = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");
const apkPath = "android/app/build/outputs/apk/release/app-release.apk";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const bumpMajor = args.includes("--major");
const bumpMinor = args.includes("--minor");
// `--patch` default — no explicit check needed, falls through as default
const versionArg = args.find((a) => a.startsWith("--version="))?.split("=")[1];
const isInteractive = args.includes("--interactive") || args.includes("-i");
const isCustom = args.includes("--custom") || args.includes("-c");

if (isInteractive && !process.stdin.isTTY) {
  console.error("[release] ❌ --interactive 模式需要 TTY 终端");
  process.exit(1);
}

if (isCustom && !process.stdin.isTTY) {
  console.error("[release] ❌ --custom 模式需要 TTY 终端");
  process.exit(1);
}

// ── 工具函数 ──

function log(...m) {
  console.log(`[release]`, ...m);
}
function warn(...m) {
  console.warn(`[release] ⚠`, ...m);
}
function ok(...m) {
  console.log(`[release] ✅`, ...m);
}

async function readText(path) {
  return readFile(resolvePath(rootDir, path), "utf-8");
}

async function writeText(path, content) {
  await writeFile(resolvePath(rootDir, path), content, "utf-8");
}

async function exists(path) {
  try {
    await stat(resolvePath(rootDir, path));
    return true;
  } catch {
    return false;
  }
}

function run(cmd, argsArr, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, argsArr, { cwd: rootDir, stdio: "inherit", ...opts });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`"${cmd} ${argsArr.join(" ")}" exited with code ${code}`));
    });
  });
}

function runOutput(cmd, argsArr) {
  return execFileSync(cmd, argsArr, {
    cwd: rootDir,
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "ignore"],
  }).trim();
}

// ── 核心流程 ──

async function getLastTag() {
  try {
    return runOutput("git", ["describe", "--tags", "--abbrev=0"]);
  } catch {
    return null;
  }
}

async function getGitLogSince(tag) {
  if (!tag) return [];
  const raw = runOutput("git", ["log", `${tag}..HEAD`, "--oneline", "--no-decorate"]);
  return raw.split("\n").filter(Boolean);
}

const CATEGORY_ENTRIES = [
  { prefixes: ["feat(", "feat:"], emoji: "✨", category: "✨ 新功能" },
  { prefixes: ["fix(", "fix:"], emoji: "🐛", category: "🐛 修复" },
  { prefixes: ["perf(", "perf:"], emoji: "⚡", category: "⚡ 性能" },
  { prefixes: ["docs(", "docs:", "📝"], emoji: "📝", category: "📝 文档" },
  { prefixes: ["chore(", "chore:", "🔧"], emoji: "🧹", category: "🧹 杂项" },
  { prefixes: ["refactor(", "refactor:"], emoji: "♻️", category: "♻️ 重构" },
  { prefixes: ["style(", "style:"], emoji: "💄", category: "💄 样式" },
  { prefixes: ["test(", "test:"], emoji: "🧪", category: "🧪 测试" },
];

function classifyCommit(msg) {
  const entry = CATEGORY_ENTRIES.find((e) => e.prefixes.some((p) => msg.startsWith(p)));
  return entry ? entry.category : "🔧 其他";
}

function formatChangelog(messages) {
  const groups = {};
  for (const msg of messages) {
    const category = classifyCommit(msg);
    if (!groups[category]) groups[category] = [];
    groups[category].push(msg);
  }
  const lines = [];
  for (const [cat, items] of Object.entries(groups)) {
    lines.push(`${cat}`);
    for (const item of items) {
      lines.push(`  ${item}`);
    }
  }
  return lines.join("\n") || "小修复与改进";
}

function generateChangelog(commits) {
  return formatChangelog(commits.map((line) => line.replace(/^[0-9a-f]+\s+/, "")));
}

function generateChangelogPreview(selected) {
  return formatChangelog(selected);
}

function parseVersion(v) {
  const parts = v.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) throw new Error(`Invalid version: ${v}`);
  return { major: parts[0], minor: parts[1], patch: parts[2], str: v };
}

function bump(v, part) {
  const p = parseVersion(v);
  switch (part) {
    case "major":
      return `${p.major + 1}.0.0`;
    case "minor":
      return `${p.major}.${p.minor + 1}.0`;
    default:
      return `${p.major}.${p.minor}.${p.patch + 1}`;
  }
}

async function patchJavaCompat() {
  // 临时将 Capacitor 各库的 Java 21 → 17，匹配当前环境 JDK
  const gradleFiles = [
    "node_modules/@capacitor/android/capacitor/build.gradle",
    "node_modules/@capacitor/app/android/build.gradle",
    "node_modules/@capacitor/preferences/android/build.gradle",
    "node_modules/@capacitor/device/android/build.gradle",
    "node_modules/capacitor-secure-storage-plugin/android/build.gradle",
    "android/app/capacitor.build.gradle",
    "android/capacitor-cordova-android-plugins/build.gradle",
    "android/app/build.gradle",
  ];
  const results = await Promise.all(
    gradleFiles.map(async (f) => {
      if (!(await exists(f))) return 0;
      let content = await readText(f);
      if (!content.includes("VERSION_21")) return 0;
      content = content.replace(/VERSION_21/g, "VERSION_17");
      await writeText(f, content);
      return 1;
    }),
  );
  return results.reduce((a, b) => a + b, 0);
}

async function askQuestion(query) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function readCustomChangelog() {
  console.log("\n请粘贴你的自定义发布文案：");
  console.log("输入完成后，在新行输入 EOF 结束\n");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const lines = [];
  for await (const line of rl) {
    if (line.trim() === "EOF") break;
    lines.push(line);
  }
  rl.close();
  const text = lines.join("\n").trim();
  if (!text) {
    console.log("  ⚠ 文案为空，请重新输入");
    return readCustomChangelog();
  }
  return text;
}

async function interactivePickCommits(commits) {
  console.log(`\n自上次发布以来的提交（共 ${commits.length} 个）:`);
  console.log("输入编号选择，支持格式: 1 3 5-8  (空格分隔, -表示范围)");
  console.log("  a = 全选  |  回车 = 空  |  q = 退出\n");

  // Display numbered list
  const items = commits.map((line) => line.replace(/^[0-9a-f]+\s+/, ""));
  for (let i = 0; i < items.length; i++) {
    const entry = CATEGORY_ENTRIES.find((e) => e.prefixes.some((p) => items[i].startsWith(p)));
    const cat = entry ? entry.emoji : "🔧";
    console.log(`  ${(i + 1).toString().padStart(3)}  ${cat}  ${items[i]}`);
  }

  // Loop until valid selection or exit
  while (true) {
    const answer = await askQuestion("\n输入编号: ");

    if (answer === "q") {
      console.log("[release] 已退出");
      process.exit(0);
    }

    let indices;
    if (answer === "a") {
      indices = items.map((_, i) => i);
    } else if (answer === "") {
      indices = [];
    } else {
      indices = [];
      const parts = answer.split(/\s+/).filter(Boolean);
      let valid = true;
      for (const part of parts) {
        if (/^\d+$/.test(part)) {
          const idx = parseInt(part, 10) - 1;
          if (idx >= 0 && idx < items.length) indices.push(idx);
        } else if (/^(\d+)-(\d+)$/.test(part)) {
          const [, s, e] = part.match(/^(\d+)-(\d+)$/);
          const start = parseInt(s, 10) - 1;
          const end = parseInt(e, 10) - 1;
          if (start >= 0 && end < items.length && start <= end) {
            for (let j = start; j <= end; j++) indices.push(j);
          } else {
            valid = false;
          }
        } else {
          valid = false;
        }
      }
      if (!valid || (indices.length === 0 && parts.some((p) => p !== ""))) {
        console.log("  ⚠ 格式错误，请重新输入");
        continue;
      }
    }

    // Deduplicate and sort
    indices = [...new Set(indices)].toSorted((a, b) => a - b);
    const selected = indices.map((i) => items[i]);

    // Show preview grouped by category
    console.log(`\n已选 ${selected.length} 个提交，生成的 changelog：\n`);
    const preview = generateChangelogPreview(selected);
    console.log(preview);

    const confirm = await askQuestion("\n确认使用? (Y/n/e=重新编辑): ");
    if (confirm.toLowerCase() === "n") {
      console.log("[release] 已取消");
      process.exit(0);
    } else if (confirm.toLowerCase() === "e") {
      continue;
    } else {
      return selected;
    }
  }
}

async function interactivePickVersion(currentVersion) {
  console.log(`\n当前版本: ${currentVersion}\n`);
  console.log("版本递增方式:");
  console.log(`  1) patch  (${currentVersion} → ${bump(currentVersion, "patch")}) — 小修复`);
  console.log(`  2) minor  (${currentVersion} → ${bump(currentVersion, "minor")}) — 新功能`);
  console.log(`  3) major  (${currentVersion} → ${bump(currentVersion, "major")}) — 大改版`);
  console.log("  4) 自定义版本号\n");

  while (true) {
    const answer = await askQuestion("选择 (1-4): ");
    switch (answer) {
      case "1":
        return { type: "patch", version: bump(currentVersion, "patch") };
      case "2":
        return { type: "minor", version: bump(currentVersion, "minor") };
      case "3":
        return { type: "major", version: bump(currentVersion, "major") };
      case "4": {
        const custom = await askQuestion("输入版本号 (格式 x.y.z): ");
        if (/^\d+\.\d+\.\d+$/.test(custom)) {
          return { type: "custom", version: custom };
        }
        console.log("  ⚠ 格式错误，请输入 x.y.z 格式（如 2.0.0）");
        break;
      }
      default:
        console.log("  ⚠ 请输入 1-4");
    }
  }
}

async function main() {
  log("Pictelio 一键发布脚本");
  if (dryRun) log("[dry-run 模式] 仅预览，不会执行任何写入/推送操作");
  console.log("");

  // ── 1. 解析版本 ──
  const pkg = JSON.parse(await readText("package.json"));
  const currentVersion = pkg.version;
  let bumpType = "patch";
  if (versionArg) {
    // 显式指定版本号
  } else if (bumpMajor) {
    bumpType = "major";
  } else if (bumpMinor) {
    bumpType = "minor";
  }
  let newVersion = versionArg || bump(currentVersion, bumpType);
  const parsed = parseVersion(newVersion);
  let versionCode = parsed.major * 10000 + parsed.minor * 100 + parsed.patch;
  let tag = `v${newVersion}`;
  let title = `Pictelio v${newVersion}`;

  log(`当前版本: ${currentVersion}`);
  log(
    `目标版本: ${newVersion} (versionCode: ${versionCode}) [${versionArg ? "指定版本" : bumpType + "递增"}]`,
  );
  log(`标签: ${tag}`);
  console.log("");

  let changelog;

  if (isCustom) {
    // ── Custom mode: user pastes their own changelog ──
    log("自定义发布模式");
    changelog = await readCustomChangelog();

    console.log("\n你的发布文案：");
    console.log("─".repeat(40));
    console.log(changelog);
    console.log("─".repeat(40));

    const ok = await askQuestion("\n确认使用? (Y/n): ");
    if (ok.toLowerCase() === "n") {
      console.log("[release] 已取消");
      process.exit(0);
    }

    const versionPick = await interactivePickVersion(currentVersion);
    const newVersionInteractive = versionPick.version;
    const { major: mi, minor: mn, patch: pt } = parseVersion(newVersionInteractive);
    newVersion = newVersionInteractive;
    versionCode = mi * 10000 + mn * 100 + pt;
    tag = `v${newVersion}`;
    title = `Pictelio v${newVersion}`;

    log(`目标版本: ${newVersion} (versionCode: ${versionCode}) [${versionPick.type}]`);
    console.log("");
  } else if (isInteractive) {
    // ── Interactive mode: user picks commits and version ──
    const lastTag = await getLastTag();
    const commits = lastTag ? await getGitLogSince(lastTag) : [];
    log(`自 ${lastTag || "初始提交"} 以来共 ${commits.length} 个提交`);

    const selectedCommits = await interactivePickCommits(commits);
    changelog = generateChangelogPreview(selectedCommits) || "小修复与改进";

    const versionPick = await interactivePickVersion(currentVersion);
    // Override the auto-detected version
    const newVersionInteractive = versionPick.version;
    const { major: mi, minor: mn, patch: pt } = parseVersion(newVersionInteractive);
    // Update all version-related variables
    newVersion = newVersionInteractive;
    versionCode = mi * 10000 + mn * 100 + pt;
    tag = `v${newVersion}`;
    title = `Pictelio v${newVersion}`;

    log(`目标版本: ${newVersion} (versionCode: ${versionCode}) [${versionPick.type}]`);
    console.log("");
    log("最终 changelog：");
    console.log(changelog);
    console.log("");
  } else {
    // ── Auto mode: existing logic ──
    const changes = [
      "🧹 依赖升级",
      "  - 升级 5 个依赖：@capacitor/core@8.4.1, @capacitor/cli@8.4.1, @types/node@26.0.1, unocss@66.7.3, vite@8.1.0",
      "  - pnpm 供应链安全配置（minimumReleaseAge, trustPolicy, blockExoticSubdeps）",
      "  - lint 修复与代码清理",
      "",
      "🐛 修复",
      "  - 个人中心返回列表时保留滚动位置和缓存状态",
      "  - 修复 TabFeedPage 组件初始化时 cached 变量读取 currentTab() 时序错误",
      "",
    ];
    changelog = changes.join("\n");

    log("自定义 changelog：");
    console.log(changelog);
    console.log("");
  }

  if (dryRun) {
    log("[dry-run] 以上是将会检测到的变更，继续展示后续步骤...");
    console.log("");
  }

  // ── 3. 检查签名环境 ──
  const keystorePassword = process.env.PICTELIO_KEYSTORE_PASSWORD;
  const keyPassword = process.env.PICTELIO_KEY_PASSWORD;
  const keystoreExists = await exists("android/app/pictelio-release.keystore");
  const envErrors = [];
  if (!keystorePassword) envErrors.push("缺少 PICTELIO_KEYSTORE_PASSWORD");
  if (!keyPassword) envErrors.push("缺少 PICTELIO_KEY_PASSWORD");
  if (!keystoreExists) envErrors.push("找不到 android/app/pictelio-release.keystore");

  if (envErrors.length > 0) {
    if (dryRun) {
      warn("签名环境检查发现问题（dry-run 模式继续）：");
      for (const e of envErrors) warn(`  - ${e}`);
      console.log("");
    } else {
      console.error("环境错误：" + envErrors.join("；"));
      console.error("请先在 ~/.zshrc 中设置 PICTELIO_KEYSTORE_PASSWORD 和 PICTELIO_KEY_PASSWORD");
      process.exit(1);
    }
  }
  ok("签名环境检查通过");
  console.log("");

  // ── 4. 更新版本号 ──
  if (!dryRun) {
    pkg.version = newVersion;
    await writeText("package.json", JSON.stringify(pkg, null, 2) + "\n");
    ok(`package.json 版本已更新为 ${newVersion}`);

    // 同步 Android 版本
    await run("node", ["scripts/sync-android-version.mjs"]);
    ok(`Android build.gradle 已同步 (versionCode: ${versionCode})`);

    // 写入 changelog
    const changelogPath = `fastlane/metadata/android/en-US/changelogs/${versionCode}.txt`;
    await mkdir(dirname(resolvePath(rootDir, changelogPath)), { recursive: true });
    await writeText(changelogPath, changelog);
    ok(`Changelog 已写入 ${changelogPath}`);

    // 更新 version.json（供 app 内检查更新使用）
    // 同时写入新旧路径，兼容已发布的旧版 APK
    const verJson =
      JSON.stringify(
        {
          version: newVersion,
          url: `https://github.com/a1121611810/pixivizer/releases/tag/${tag}`,
          changelog: changelog.slice(0, 200),
        },
        null,
        2,
      ) + "\n";
    await mkdir(dirname(resolvePath(rootDir, "../../packages/website/version.json")), {
      recursive: true,
    });
    await writeText("../../packages/website/version.json", verJson);
    await mkdir(dirname(resolvePath(rootDir, "../../website/version.json")), { recursive: true });
    await writeText("../../website/version.json", verJson);
    ok(`version.json 已更新 (${newVersion})`);
  } else {
    log(`[dry-run] 将更新 package.json → ${newVersion}`);
    log(`[dry-run] 将运行 sync-android-version (versionCode → ${versionCode})`);
    log(`[dry-run] 将写入 changelog → fastlane/.../changelogs/${versionCode}.txt`);
    log(`[dry-run] 将更新 version.json → ${newVersion}`);
  }
  console.log("");

  // ── 5. Java 兼容性补丁 ──
  const patched = await patchJavaCompat();
  if (patched > 0) ok(`已修补 ${patched} 个 Gradle 文件的 Java 兼容性`);
  else warn("未找到需要修补的 Gradle 文件");
  console.log("");

  // ── 6. 构建 APK ──
  if (!dryRun) {
    log("开始构建 Release APK...");
    await run("pnpm", ["run", "sync:android-version"], { stdio: "inherit" });
    await run("pnpm", ["run", "build"], { stdio: "inherit" });
    await run("pnpm", ["run", "cap:sync"], { stdio: "inherit" });
    // cap:sync 会重新生成 capacitor.build.gradle（VERSION_21），需要重新修补
    const patchedAfterSync = await patchJavaCompat();
    if (patchedAfterSync > 0) ok(`cap:sync 后重新修补 ${patchedAfterSync} 个 Gradle 文件`);
    // 使用 /tmp/gr 作为 Gradle 缓存避免系统 .gradle 锁问题
    await run("./gradlew", ["assembleRelease"], {
      cwd: resolvePath(rootDir, "android"),
      stdio: "inherit",
      env: {
        ...process.env,
        GRADLE_USER_HOME: "/tmp/gr",
      },
    });
    ok("APK 构建成功");
  } else {
    log("[dry-run] 将执行 pnpm run build:android:release");
  }

  // 验证 APK
  const apkExists = await exists(apkPath);
  if (!apkExists) {
    console.error(`错误：APK 未生成 (${apkPath})`);
    process.exit(1);
  }
  ok(`APK 就绪: ${resolvePath(rootDir, apkPath)}`);
  console.log("");

  // ── 7. Git 提交 + Tag ──
  if (!dryRun) {
    await run("git", ["add", "-A"]);
    await run("git", ["commit", "-m", `chore: bump version to ${newVersion}`, "-m", changelog]);
    await run("git", ["tag", "-a", tag, "-m", title]);
    ok(`Git 已提交并打标签 ${tag}`);
  } else {
    log(`[dry-run] 将执行: git commit + git tag ${tag}`);
  }
  console.log("");

  // ── 8. 推送到 GitHub ──
  if (!dryRun) {
    log("推送到远程...");
    await run("git", ["push", "origin", "main", "--tags"]);
    ok("已推送到 GitHub");
  } else {
    log("[dry-run] 将执行: git push origin main --tags");
  }
  console.log("");

  // ── 9. 创建 GitHub Release 并上传 APK ──
  if (!dryRun) {
    log("创建 GitHub Release...");
    const apkAbs = resolvePath(rootDir, apkPath);
    const child = execFile(
      "gh",
      [
        "release",
        "create",
        tag,
        "--repo",
        runOutput("git", ["remote", "get-url", "origin"])
          .replace(/\.git$/, "")
          .replace(/.*github\.com[/:]/, "")
          .replace(/\.git$/, ""),
        "--title",
        title,
        "--notes-file",
        "-",
        apkAbs,
      ],
      { cwd: rootDir, stdio: ["pipe", "inherit", "inherit"] },
    );
    child.stdin.write(changelog);
    child.stdin.end();
    await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new Error(`gh release create exited with code ${code}`)),
      );
    });
    ok(`GitHub Release ${tag} 发布成功！`);
  } else {
    log(`[dry-run] 将执行: gh release create ${tag} --title "${title}" --notes ... + 上传 APK`);
  }

  console.log("");
  console.log("=".repeat(50));
  console.log(`🎉 发布流程完成！`);
  console.log(`   版本: ${newVersion}`);
  console.log(`   标签: ${tag}`);
  console.log(`   APK: ${resolvePath(rootDir, apkPath)}`);
  console.log(
    `   地址: https://github.com/${runOutput("git", ["remote", "get-url", "origin"])
      .replace(/.*github\.com[/:]/, "")
      .replace(/\.git$/, "")}/releases/tag/${tag}`,
  );
  console.log("=".repeat(50));
}

main().catch((err) => {
  console.error(`\n[release] ❌ 失败: ${err.message}`);
  process.exit(1);
});

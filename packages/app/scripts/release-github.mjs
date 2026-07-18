// GitHub Release automation script for Pictelio.
// Builds the signed release APK and publishes it to a GitHub release.
//
// Usage:
//   Pnpm exec node scripts/release-github.mjs --repo=yourname/pictelio
//   PICTELIO_GITHUB_REPO=yourname/pictelio pnpm exec node scripts/release-github.mjs
//   Pnpm exec node scripts/release-github.mjs --dry-run

import { readFile, stat } from "node:fs/promises";
import { execFile, execFileSync } from "node:child_process";
import { resolve as resolvePath } from "node:path";
import process from "node:process";

const repoArgPrefix = "--repo=";
const envVarName = "PICTELIO_GITHUB_REPO";
const requiredKeystore = "android/app/pictelio-release.keystore";
const apkPath = "android/app/build/outputs/apk/release/app-release.apk";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const repoArg = args.find((arg) => arg.startsWith(repoArgPrefix))?.slice(repoArgPrefix.length);

function readText(path) {
  return readFile(path, "utf-8");
}

async function fileExists(path) {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

function parseGitRemoteUrl(url) {
  // Supports:
  //   https://github.com/owner/repo.git
  //   https://github.com/owner/repo
  //   Git@github.com:owner/repo.git
  //   Git@github.com:owner/repo
  if (!url) {
    return null;
  }
  const httpsMatch = url.match(/github\.com[/u:]([^/]+)\/([^/u\s]+?)(?:\.git)?$/iu);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }
  return null;
}

function getGitOriginRepo() {
  try {
    const url = execFileSync("git", ["remote", "get-url", "origin"], {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return parseGitRemoteUrl(url);
  } catch {
    return null;
  }
}

async function getVersionFromPackage() {
  const pkg = JSON.parse(await readText("package.json"));
  if (!pkg.version || typeof pkg.version !== "string") {
    throw new Error("无法从 package.json 读取 version 字段");
  }
  return pkg.version;
}

async function getVersionCodeFromGradle() {
  const gradle = await readText("android/app/build.gradle");
  const match = gradle.match(/versionCode\s+(\d+)/u);
  if (!match) {
    throw new Error("无法从 android/app/build.gradle 读取 versionCode");
  }
  return match[1];
}

function checkGhAvailable() {
  return new Promise((resolve) => {
    execFile("gh", ["--version"], (error) => {
      resolve(!error);
    });
  });
}

function checkGhAuthenticated() {
  return new Promise((resolve) => {
    execFile("gh", ["auth", "status"], (error) => {
      resolve(!error);
    });
  });
}

function printGhInstructions() {
  console.error("未检测到可用的 GitHub CLI（gh）或尚未登录。");
  console.error("");
  console.error("请按以下步骤安装并认证：");
  console.error("  1. 安装 gh CLI：https://cli.github.com/");
  console.error("  2. 运行：gh auth login");
  console.error("  3. 选择 HTTPS 或 SSH，按提示完成授权");
  console.error("");
  console.error("完成后重新执行本脚本。");
}

function shellQuote(arg) {
  // 将参数安全地转义为可粘贴到 shell 的格式。
  // 包含空格、引号或特殊 shell 字符的参数用单引号包裹。
  if (/^[a-zA-Z0-9_./u:@-]+$/u.test(arg)) {
    return arg;
  }
  return `'${arg.replace(/'/gu, `'\\''`)}'`;
}

function execBuild(dry) {
  if (dry) {
    console.log("[dry-run] 将执行：pnpm run build:android:release");
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const child = execFile("pnpm", ["run", "build:android:release"], { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`build:android:release 退出码 ${code}`));
      }
    });
  });
}

function createGitHubRelease(repo, tag, title, notes, apk, dry) {
  const notesArg = notes ? `--notes-file=-` : "--generate-notes";
  const cmdParts = [
    "gh",
    "release",
    "create",
    tag,
    "--repo",
    repo,
    "--title",
    title,
    notesArg,
    apk,
  ];
  if (dry) {
    console.log(`[dry-run] 将执行：${cmdParts.map(shellQuote).join(" ")}`);
    if (notes) {
      console.log("[dry-run] release notes 内容：");
      console.log(notes);
    }
    return;
  }

  return new Promise((resolve, reject) => {
    const child = execFile("gh", cmdParts.slice(1), {
      stdio: ["pipe", "inherit", "inherit"],
    });
    if (notes) {
      child.stdin.write(notes);
    }
    child.stdin.end();
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`gh release create 退出码 ${code}`));
      }
    });
  });
}

async function main() {
  console.log(
    dryRun ? "[dry-run] Pictelio GitHub Release 自动化脚本" : "Pictelio GitHub Release 自动化脚本",
  );
  console.log("");

  // 1. 解析目标仓库
  let repo = repoArg || process.env[envVarName] || getGitOriginRepo();
  if (!repo) {
    console.error("错误：无法确定目标 GitHub 仓库。");
    console.error("请通过以下任一方式指定：");
    console.error(`  - CLI 参数：--repo=owner/repo`);
    console.error(`  - 环境变量：${envVarName}=owner/repo`);
    console.error("  - 或者确保当前 git remote origin 指向 GitHub 仓库");
    process.exit(1);
  }
  // 清理可能的 .git 后缀
  repo = repo.replace(/\.git$/iu, "");
  console.log(`目标仓库：${repo}`);

  // 2. 读取版本信息
  const version = await getVersionFromPackage();
  const versionCode = await getVersionCodeFromGradle();
  const tag = `v${version}`;
  const title = `Pictelio v${version}`;
  console.log(`版本：${version}（versionCode: ${versionCode}）`);
  console.log(`标签：${tag}`);
  console.log(`标题：${title}`);

  // 3. 检查签名环境
  const keystorePassword = process.env.PICTELIO_KEYSTORE_PASSWORD;
  const keyPassword = process.env.PICTELIO_KEY_PASSWORD;
  const keystoreExists = await fileExists(requiredKeystore);
  const errors = [];

  if (!keystorePassword) {
    errors.push("缺少环境变量 PICTELIO_KEYSTORE_PASSWORD");
  }
  if (!keyPassword) {
    errors.push("缺少环境变量 PICTELIO_KEY_PASSWORD");
  }
  if (!keystoreExists) {
    errors.push(`找不到 release keystore：${requiredKeystore}`);
  }

  if (errors.length > 0) {
    if (dryRun) {
      console.log("[dry-run] 签名环境检查发现问题：");
      for (const error of errors) {
        console.log(`  - ${error}`);
      }
      console.log("[dry-run] 继续展示将要执行的步骤…");
      console.log("");
    } else {
      console.error("错误：" + errors.join("；"));
      console.error("请参考 docs/release-signing.md 配置签名环境变量并放置 keystore 文件");
      process.exit(1);
    }
  } else {
    console.log("签名环境检查通过");
  }

  // 4. 检查 gh CLI
  if (!dryRun) {
    const ghAvailable = await checkGhAvailable();
    if (!ghAvailable) {
      printGhInstructions();
      process.exit(1);
    }
    const ghAuthenticated = await checkGhAuthenticated();
    if (!ghAuthenticated) {
      printGhInstructions();
      process.exit(1);
    }
    console.log("GitHub CLI 已安装并认证");
  } else {
    console.log("[dry-run] 跳过 gh CLI 检查");
  }

  // 5. 构建 APK
  await execBuild(dryRun);

  // 6. 验证 APK 存在
  const apkExists = await fileExists(apkPath);
  if (!apkExists) {
    if (dryRun) {
      console.log(`[dry-run] 将验证 APK 是否存在：${apkPath}`);
    } else {
      console.error(`错误：构建后未找到 APK 文件：${apkPath}`);
      process.exit(1);
    }
  } else if (dryRun) {
    console.log(`[dry-run] APK 文件已存在：${resolvePath(apkPath)}`);
  } else {
    console.log(`APK 已生成：${resolvePath(apkPath)}`);
  }

  // 7. 读取 changelog
  const changelogPath = `fastlane/metadata/android/en-US/changelogs/${versionCode}.txt`;
  let notes = "";
  const changelogExists = await fileExists(changelogPath);
  if (changelogExists) {
    notes = await readText(changelogPath);
    console.log(`使用 changelog：${changelogPath}`);
  } else {
    notes = `Release ${tag} of Pictelio.`;
    console.log(`未找到 ${changelogPath}，使用默认 release notes`);
  }

  // 8. 创建 GitHub release
  await createGitHubRelease(repo, tag, title, notes, apkPath, dryRun);

  if (dryRun) {
    console.log("");
    if (errors.length > 0) {
      console.log("[dry-run] 已完成，但签名环境未就绪。请先修复上述问题后再正式运行。");
      process.exit(1);
    }
    console.log("[dry-run] 已完成。以上是要执行的步骤，未实际构建或发布。");
  } else {
    console.log("");
    console.log(`✅ GitHub Release ${tag} 发布成功！`);
    console.log(`APK 已上传：${resolvePath(apkPath)}`);
    console.log(`可在 https://github.com/${repo}/releases/tag/${tag} 查看`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

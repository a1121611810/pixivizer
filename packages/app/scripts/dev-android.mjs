#!/usr/bin/env node
/* eslint-disable no-await-in-loop */
/**
 * 一键启动 Android 开发流程：
 * 1. 启动 Vite dev server（暴露网络访问）
 * 2. 自动获取本机 Wi-Fi IP
 * 3. 将 dev server URL 同步到 Capacitor Android 配置
 * 4. 编译 debug APK
 * 5. 通过 adb 安装到已连接设备
 *
 * 前置条件：
 * - 手机和电脑在同一 Wi-Fi
 * - adb 已连接设备（有线/无线均可）
 * - 项目依赖已安装（pnpm install）
 */
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const PORT = 5173;
const APK_PATH = "android/app/build/outputs/apk/debug/app-debug.apk";

function getLocalIp() {
  const interfaces = networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family !== "IPv4" || iface.internal) {
        continue;
      }
      const addr = iface.address;
      if (addr.startsWith("127.")) {
        continue;
      }
      // 优先返回常见内网网段
      if (addr.startsWith("192.168.") || addr.startsWith("10.")) {
        candidates.unshift({ name, address: addr });
      } else if (addr.startsWith("172.")) {
        const second = Number(addr.split(".")[1]);
        if (second >= 16 && second <= 31) {
          candidates.unshift({ name, address: addr });
        }
      } else {
        candidates.push({ name, address: addr });
      }
    }
  }
  return candidates[0]?.address ?? null;
}

async function waitForDevServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok || res.status === 404) {
        return;
      }
    } catch {
      // 未就绪，继续等待
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Dev server 未在 ${PORT} 端口启动`);
}

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ ${cmd} ${args.join(" ")}`);
    const proc = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
      ...options,
    });
    proc.on("close", (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`命令退出码 ${code}: ${cmd} ${args.join(" ")}`));
      }
    });
  });
}

async function main() {
  const ip = getLocalIp();
  if (!ip) {
    console.error("无法获取本机内网 IP，请确认已连接 Wi-Fi");
    process.exit(1);
  }
  const devUrl = `http://${ip}:${PORT}`;
  console.log(`\n✓ 本机 IP: ${ip}`);
  console.log(`✓ Dev server 将暴露为: ${devUrl}`);

  // 启动 dev server
  console.log("\n▶ 启动 Vite dev server...");
  const devServer = spawn("pnpm", ["dev", "--", "--host", "--port", String(PORT), "--strictPort"], {
    stdio: "inherit",
  });

  // 确保脚本退出时杀掉 dev server
  const cleanup = () => {
    console.log("\n◀ 停止 dev server...");
    devServer.kill("SIGTERM");
  };
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await waitForDevServer();
    console.log("\n✓ Dev server 已就绪");

    // 同步 Capacitor 配置
    await run("pnpm", ["cap:sync"], {
      env: { ...process.env, CAPACITOR_DEV_SERVER_URL: devUrl },
    });

    // 编译 debug APK
    await run("./gradlew", ["assembleDebug"], { cwd: "android" });

    // 通过 adb 安装
    await run("adb", ["install", "-r", APK_PATH]);

    console.log("\n✅ 完成！APK 已安装，dev server 正在运行。");
    console.log("   按 Ctrl+C 停止 dev server。");
  } catch (error) {
    console.error("\n❌ 出错:", error.message);
    cleanup();
    process.exit(1);
  }
}

void main();

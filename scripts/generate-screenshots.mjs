#!/usr/bin/env node
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const EN_IMAGES = path.join(ROOT, "fastlane/metadata/android/en-US/images");
const ZH_IMAGES = path.join(ROOT, "fastlane/metadata/android/zh-CN/images");
const PHONE_DIR_EN = path.join(EN_IMAGES, "phoneScreenshots");
const PHONE_DIR_ZH = path.join(ZH_IMAGES, "phoneScreenshots");

const PHONE_W = 1080;
const PHONE_H = 1920;
const STATUS_H = 42;
const TOP_NAV_H = 120;
const BOTTOM_NAV_H = 112;
const BOTTOM_NAV_Y = PHONE_H - BOTTOM_NAV_H;

const BRAND = {
  teal1: "#0d7377",
  teal2: "#14a085",
  blue: "#0078d4",
  white: "#ffffff",
  black: "#1a1a1a",
  gray100: "#f3f2f1",
  gray200: "#e1dfdd",
  gray300: "#c8c6c4",
  gray500: "#8a8886",
  gray700: "#616161",
  gray900: "#323130",
  danger: "#d13438",
};

const FONT_STACK = "'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Segoe UI', sans-serif";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function removeGitkeep(dir) {
  for (const entry of fs.readdirSync(dir)) {
    if (entry.endsWith(".gitkeep")) {
      fs.unlinkSync(path.join(dir, entry));
    }
  }
}

function renderPng(svg, width, outPath) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { defaultFontFamily: FONT_STACK },
  });
  const png = resvg.render();
  fs.writeFileSync(outPath, png.asPng());
  const { height } = png;
  console.log(`✓ ${path.relative(ROOT, outPath)} (${width}×${height})`);
}

function svgWrapper(width, height, content) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BRAND.teal1}"/>
      <stop offset="55%" stop-color="${BRAND.teal2}"/>
      <stop offset="100%" stop-color="${BRAND.blue}"/>
    </linearGradient>
    <linearGradient id="cardGrad1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#b3e5fc"/>
      <stop offset="100%" stop-color="#81d4fa"/>
    </linearGradient>
    <linearGradient id="cardGrad2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c8e6c9"/>
      <stop offset="100%" stop-color="#a5d6a7"/>
    </linearGradient>
    <linearGradient id="cardGrad3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ffe0b2"/>
      <stop offset="100%" stop-color="#ffcc80"/>
    </linearGradient>
    <linearGradient id="cardGrad4" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e1bee7"/>
      <stop offset="100%" stop-color="#ce93d8"/>
    </linearGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
  </defs>
  ${content}
</svg>`;
}

const LOGO_SVG = fs.readFileSync(path.join(ROOT, "assets/logo/pictelio-logo.svg"), "utf8");

// ---------------------------------------------------------------------------
// Feature Graphic (1024×500)
// ---------------------------------------------------------------------------
function featureGraphic() {
  const w = 1024;
  const h = 500;
  const logoSize = 160;
  const content = `
    <rect width="${w}" height="${h}" fill="url(#bgGrad)"/>
    <circle cx="820" cy="80" r="220" fill="${BRAND.white}" opacity="0.06"/>
    <circle cx="120" cy="420" r="160" fill="${BRAND.white}" opacity="0.05"/>
    <g transform="translate(80, 170)">
      ${LOGO_SVG.replace("<svg", `<svg width="${logoSize}" height="${logoSize}"`).replace(/viewBox="[^"]*"/, 'viewBox="0 0 192 192"')}
    </g>
    <text x="272" y="250" font-family="${FONT_STACK}" font-size="92" font-weight="700" fill="${BRAND.white}">Pictelio</text>
    <text x="278" y="310" font-family="${FONT_STACK}" font-size="34" fill="${BRAND.white}" opacity="0.95">第三方 Pixiv 客户端 · 为 Android 打造</text>
    <rect x="80" y="348" width="96" height="6" rx="3" fill="${BRAND.white}" opacity="0.8"/>
  `;
  return svgWrapper(w, h, content);
}

// ---------------------------------------------------------------------------
// Common phone shell components
// ---------------------------------------------------------------------------
function statusBar() {
  const time = "09:41";
  const w = PHONE_W;
  return `
    <rect width="${w}" height="${STATUS_H}" fill="${BRAND.gray900}"/>
    <text x="36" y="28" font-family="${FONT_STACK}" font-size="22" fill="${BRAND.white}" font-weight="600">${time}</text>
    <g transform="translate(${w - 110}, 12)">
      <path d="M4 4h16v12H4z" fill="none" stroke="${BRAND.white}" stroke-width="1.5"/>
      <rect x="6" y="6" width="12" height="8" fill="${BRAND.white}"/>
      <path d="M24 8h3v4h-3z" fill="${BRAND.white}"/>
      <path d="M30 6h3v8h-3z" fill="${BRAND.white}"/>
      <path d="M36 4h3v12h-3z" fill="${BRAND.white}"/>
    </g>
  `;
}

function bottomNav(activeIndex = 0, labels = ["推荐", "关注", "收藏", "设置"]) {
  const w = PHONE_W;
  const h = BOTTOM_NAV_H;
  const y = BOTTOM_NAV_Y;
  const icons = [
    {
      path: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
      size: 24,
    },
    {
      path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z",
      size: 24,
    },
    { path: "M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z", size: 24 },
    {
      path: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84a.484.484 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.27.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.58 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
      size: 24,
    },
  ];
  const itemW = w / labels.length;
  let items = "";
  for (let i = 0; i < labels.length; i++) {
    const x = i * itemW + itemW / 2;
    const color = i === activeIndex ? BRAND.teal1 : BRAND.gray500;
    const s = icons[i].size;
    const scale = 1;
    items += `
      <g transform="translate(${x - s / 2}, ${y + 20})">
        <path d="${icons[i].path}" fill="${color}" transform="scale(${scale})"/>
      </g>
      <text x="${x}" y="${y + 66}" text-anchor="middle" font-family="${FONT_STACK}" font-size="20" fill="${color}" font-weight="${i === activeIndex ? 600 : 400}">${labels[i]}</text>
    `;
  }
  return `
    <rect y="${y}" width="${w}" height="${h}" fill="${BRAND.white}"/>
    <line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${BRAND.gray200}" stroke-width="2"/>
    ${items}
  `;
}

function topNav(title, showBack = false, showSearch = false) {
  const w = PHONE_W;
  const h = TOP_NAV_H;
  let left = "";
  if (showBack) {
    left = `<path d="M36 66 L58 88 L36 110" fill="none" stroke="${BRAND.gray900}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  let right = "";
  if (showSearch) {
    right = `<circle cx="${w - 54}" cy="76" r="18" fill="none" stroke="${BRAND.gray900}" stroke-width="4"/><line x1="${w - 40}" y1="90" x2="${w - 30}" y2="100" stroke="${BRAND.gray900}" stroke-width="4" stroke-linecap="round"/>`;
  }
  return `
    <rect width="${w}" height="${h}" fill="${BRAND.white}"/>
    ${left}
    <text x="${showBack ? 80 : 36}" y="82" font-family="${FONT_STACK}" font-size="34" font-weight="700" fill="${BRAND.gray900}">${title}</text>
    ${right}
    <line x1="0" y1="${h - 1}" x2="${w}" y2="${h - 1}" stroke="${BRAND.gray200}" stroke-width="2"/>
  `;
}

function phoneWrapper(content, activeNav = -1) {
  return svgWrapper(
    PHONE_W,
    PHONE_H,
    `
    <rect width="${PHONE_W}" height="${PHONE_H}" fill="${BRAND.gray100}"/>
    ${statusBar()}
    <g transform="translate(0, ${STATUS_H})">
      ${content}
    </g>
    ${activeNav >= 0 ? bottomNav(activeNav) : bottomNav(-1)}
  `,
  );
}

// ---------------------------------------------------------------------------
// Screenshot 01 — Feed
// ---------------------------------------------------------------------------
function screenshotFeed() {
  const w = PHONE_W;
  const tabs = ["推荐", "关注"];
  const tabBarH = 72;
  const startY = TOP_NAV_H + 20;
  let tabsSvg = `<rect x="0" y="${TOP_NAV_H}" width="${w}" height="${tabBarH}" fill="${BRAND.white}"/>`;
  tabsSvg += `<rect x="36" y="${TOP_NAV_H + tabBarH - 4}" width="56" height="4" rx="2" fill="${BRAND.teal1}"/>`;
  tabsSvg += `<text x="36" y="${TOP_NAV_H + 46}" font-family="${FONT_STACK}" font-size="28" font-weight="700" fill="${BRAND.gray900}">${tabs[0]}</text>`;
  tabsSvg += `<text x="142" y="${TOP_NAV_H + 46}" font-family="${FONT_STACK}" font-size="28" fill="${BRAND.gray500}">${tabs[1]}</text>`;

  const cards = [
    {
      x: 40,
      y: startY + tabBarH + 20,
      width: 496,
      height: 560,
      grad: "url(#cardGrad1)",
      title: "午后街角",
      author: "Aria",
      avatar: "#81d4fa",
    },
    {
      x: 544,
      y: startY + tabBarH + 20,
      width: 496,
      height: 720,
      grad: "url(#cardGrad2)",
      title: "森林精灵",
      author: "Mira",
      avatar: "#a5d6a7",
    },
    {
      x: 40,
      y: startY + tabBarH + 20 + 560 + 24,
      width: 496,
      height: 680,
      grad: "url(#cardGrad3)",
      title: "秋日落日",
      author: "Kaito",
      avatar: "#ffcc80",
    },
    {
      x: 544,
      y: startY + tabBarH + 20 + 720 + 24,
      width: 496,
      height: 520,
      grad: "url(#cardGrad4)",
      title: "星夜幻想",
      author: "Luna",
      avatar: "#ce93d8",
    },
  ];

  let cardsSvg = "";
  for (const c of cards) {
    cardsSvg += `
      <rect x="${c.x}" y="${c.y}" width="${c.width}" height="${c.height}" rx="20" fill="${BRAND.white}" filter="url(#softShadow)"/>
      <rect x="${c.x + 12}" y="${c.y + 12}" width="${c.width - 24}" height="${c.height - 120}" rx="14" fill="${c.grad}"/>
      <circle cx="${c.x + 34}" cy="${c.y + c.height - 42}" r="18" fill="${c.avatar}"/>
      <text x="${c.x + 64}" y="${c.y + c.height - 32}" font-family="${FONT_STACK}" font-size="22" fill="${BRAND.gray700}">${c.author}</text>
      <text x="${c.x + 24}" y="${c.y + c.height - 72}" font-family="${FONT_STACK}" font-size="26" font-weight="600" fill="${BRAND.gray900}">${c.title}</text>
    `;
  }

  return phoneWrapper(
    `
    ${topNav("Pictelio", false, true)}
    ${tabsSvg}
    ${cardsSvg}
  `,
    0,
  );
}

// ---------------------------------------------------------------------------
// Screenshot 02 — Illustration Detail
// ---------------------------------------------------------------------------
function screenshotDetail() {
  const w = PHONE_W;
  const topH = TOP_NAV_H;
  const imageY = topH + 20;
  const imageH = 860;

  return phoneWrapper(
    `
    ${topNav("作品详情", true)}
    <rect x="24" y="${imageY}" width="${w - 48}" height="${imageH}" rx="24" fill="url(#cardGrad1)" filter="url(#softShadow)"/>
    <text x="${w / 2}" y="${imageY + imageH / 2}" text-anchor="middle" font-family="${FONT_STACK}" font-size="40" fill="${BRAND.gray700}" opacity="0.7">插画预览</text>

    <circle cx="80" cy="${imageY + imageH + 56}" r="40" fill="url(#cardGrad2)"/>
    <text x="140" y="${imageY + imageH + 52}" font-family="${FONT_STACK}" font-size="32" font-weight="700" fill="${BRAND.gray900}">森林精灵</text>
    <text x="140" y="${imageY + imageH + 88}" font-family="${FONT_STACK}" font-size="24" fill="${BRAND.gray500}">Mira · 2024-06-27</text>

    <text x="48" y="${imageY + imageH + 160}" font-family="${FONT_STACK}" font-size="28" font-weight="700" fill="${BRAND.gray900}">标题</text>
    <text x="48" y="${imageY + imageH + 204}" font-family="${FONT_STACK}" font-size="26" fill="${BRAND.gray700}">静谧森林中的光之精灵，柔和笔触呈现午后氛围。</text>

    <g transform="translate(48, ${imageY + imageH + 260})">
      <rect width="180" height="64" rx="32" fill="${BRAND.teal1}"/>
      <text x="90" y="42" text-anchor="middle" font-family="${FONT_STACK}" font-size="24" font-weight="600" fill="${BRAND.white}">收藏</text>
    </g>
    <g transform="translate(252, ${imageY + imageH + 260})">
      <rect width="180" height="64" rx="32" fill="${BRAND.gray200}"/>
      <text x="90" y="42" text-anchor="middle" font-family="${FONT_STACK}" font-size="24" font-weight="600" fill="${BRAND.gray900}">下载</text>
    </g>
  `,
    -1,
  );
}

// ---------------------------------------------------------------------------
// Screenshot 03 — Settings Sheet
// ---------------------------------------------------------------------------
function screenshotSettings() {
  const w = PHONE_W;
  const startY = TOP_NAV_H + 24;

  const rows = [
    { icon: moonIcon(), title: "深色模式", value: "关闭", hasSwitch: true, on: false },
    { icon: warningIcon(), title: "显示 R18 内容", value: "", hasSwitch: true, on: true },
    { icon: trashIcon(), title: "清除所有本地数据", value: "", danger: true },
    { icon: infoIcon(), title: "关于 Pictelio", value: "v1.0.0" },
    { icon: docIcon(), title: "隐私政策", value: "" },
  ];

  const rowH = 104;
  let rowsSvg = `<rect x="24" y="${startY}" width="${w - 48}" height="${rows.length * rowH + 16}" rx="24" fill="${BRAND.white}" filter="url(#softShadow)"/>`;

  rows.forEach((row, i) => {
    const y = startY + 16 + i * rowH;
    const color = row.danger ? BRAND.danger : BRAND.gray900;
    rowsSvg += `
      <g transform="translate(36, ${y + 32})">${row.icon}</g>
      <text x="96" y="${y + 64}" font-family="${FONT_STACK}" font-size="30" fill="${color}">${row.title}</text>
      ${row.value ? `<text x="${w - 72}" y="${y + 64}" text-anchor="end" font-family="${FONT_STACK}" font-size="26" fill="${BRAND.gray500}">${row.value}</text>` : ""}
      ${row.hasSwitch ? switchControl(w - 112, y + 32, row.on) : ""}
      ${i < rows.length - 1 ? `<line x1="96" y1="${y + rowH - 2}" x2="${w - 40}" y2="${y + rowH - 2}" stroke="${BRAND.gray200}" stroke-width="2"/>` : ""}
    `;
  });

  return phoneWrapper(
    `
    ${topNav("设置")}
    ${rowsSvg}
  `,
    3,
  );
}

function switchControl(x, y, on) {
  const color = on ? BRAND.teal1 : BRAND.gray300;
  const cx = on ? x + 56 : x + 16;
  return `
    <rect x="${x}" y="${y}" width="72" height="40" rx="20" fill="${color}"/>
    <circle cx="${cx}" cy="${y + 20}" r="16" fill="${BRAND.white}"/>
  `;
}

function moonIcon() {
  return `<path d="M20 12c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8c.62 0 1.22.07 1.79.2C10.93 6.18 10 8.95 10 12c0 3.866 3.134 7 7 7 .76 0 1.49-.12 2.17-.34-.59 1.94-2.42 3.34-4.58 3.34-2.65 0-4.8-2.15-4.8-4.8 0-2.65 2.15-4.8 4.8-4.8.44 0 .86.06 1.26.17C15.85 10.76 17.64 11.36 20 12z" fill="${BRAND.gray500}" transform="scale(1.2)"/>`;
}

function warningIcon() {
  return `<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" fill="${BRAND.danger}" transform="scale(1.2)"/>`;
}

function trashIcon() {
  return `<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="${BRAND.danger}" transform="scale(1.2)"/>`;
}

function infoIcon() {
  return `<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="${BRAND.gray500}" transform="scale(1.2)"/>`;
}

function docIcon() {
  return `<path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="${BRAND.gray500}" transform="scale(1.2)"/>`;
}

// ---------------------------------------------------------------------------
// Screenshot 04 — Login
// ---------------------------------------------------------------------------
function screenshotLogin() {
  const w = PHONE_W;
  const centerY = 520;

  return phoneWrapper(
    `
    <rect width="${w}" height="${PHONE_H - STATUS_H}" fill="${BRAND.white}"/>
    <g transform="translate(${w / 2 - 100}, ${centerY - 120})">
      ${LOGO_SVG.replace("<svg", '<svg width="200" height="200"').replace(/viewBox="[^"]*"/, 'viewBox="0 0 192 192"')}
    </g>
    <text x="${w / 2}" y="${centerY + 140}" text-anchor="middle" font-family="${FONT_STACK}" font-size="64" font-weight="700" fill="${BRAND.gray900}">Pictelio</text>
    <text x="${w / 2}" y="${centerY + 200}" text-anchor="middle" font-family="${FONT_STACK}" font-size="28" fill="${BRAND.gray500}">第三方 Pixiv 客户端</text>

    <rect x="72" y="${centerY + 300}" width="${w - 144}" height="96" rx="12" fill="${BRAND.gray100}" stroke="${BRAND.gray300}" stroke-width="2"/>
    <text x="96" y="${centerY + 356}" font-family="${FONT_STACK}" font-size="26" fill="${BRAND.gray500}">refresh_token</text>

    <rect x="72" y="${centerY + 430}" width="${w - 144}" height="96" rx="48" fill="url(#bgGrad)" filter="url(#softShadow)"/>
    <text x="${w / 2}" y="${centerY + 488}" text-anchor="middle" font-family="${FONT_STACK}" font-size="30" font-weight="700" fill="${BRAND.white}">登录</text>

    <rect x="96" y="${centerY + 580}" width="${w - 192}" height="2" fill="${BRAND.gray200}"/>
    <text x="${w / 2}" y="${centerY + 640}" text-anchor="middle" font-family="${FONT_STACK}" font-size="24" fill="${BRAND.gray500}">本应用与 Pixiv Inc. 无任何关联</text>
    <text x="${w / 2}" y="${centerY + 678}" text-anchor="middle" font-family="${FONT_STACK}" font-size="24" fill="${BRAND.gray500}">第三方客户端，仅供学习交流使用</text>
  `,
    -1,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
ensureDir(PHONE_DIR_EN);
ensureDir(PHONE_DIR_ZH);

const jobs = [
  { name: "featureGraphic.png", svg: featureGraphic(), width: 1024 },
  { name: "phoneScreenshots/01_feed.png", svg: screenshotFeed(), width: 1080 },
  { name: "phoneScreenshots/02_detail.png", svg: screenshotDetail(), width: 1080 },
  { name: "phoneScreenshots/03_settings.png", svg: screenshotSettings(), width: 1080 },
  { name: "phoneScreenshots/04_login.png", svg: screenshotLogin(), width: 1080 },
];

for (const job of jobs) {
  const enPath = path.join(EN_IMAGES, job.name);
  renderPng(job.svg, job.width, enPath);
  const zhPath = path.join(ZH_IMAGES, job.name);
  fs.copyFileSync(enPath, zhPath);
  console.log(`✓ ${path.relative(ROOT, zhPath)} (copied)`);
}

removeGitkeep(EN_IMAGES);
removeGitkeep(PHONE_DIR_EN);
removeGitkeep(ZH_IMAGES);
removeGitkeep(PHONE_DIR_ZH);

console.log("\nFastlane screenshots generated successfully.");

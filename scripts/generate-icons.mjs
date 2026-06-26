import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = join(scriptDir, "..");

function render(svgPath, size, outPath) {
  const svg = readFileSync(svgPath, "utf8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: size },
    background: "transparent",
  });
  const png = resvg.render().asPng();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  console.log(`generated: ${outPath}`);
}

const androidDensities = [
  { name: "mdpi", scale: 1 },
  { name: "hdpi", scale: 1.5 },
  { name: "xhdpi", scale: 2 },
  { name: "xxhdpi", scale: 3 },
  { name: "xxxhdpi", scale: 4 },
];

const logoSvg = join(root, "assets/logo/pixivizer-logo.svg");
const fgSvg = join(root, "assets/logo/ic_launcher_foreground.svg");

// Favicon + PWA
render(logoSvg, 16, join(root, "public/favicon-16x16.png"));
render(logoSvg, 32, join(root, "public/favicon-32x32.png"));
render(logoSvg, 192, join(root, "public/logo-192x192.png"));
render(logoSvg, 512, join(root, "public/logo-512x512.png"));

// Android legacy launcher icons (48dp base)
for (const d of androidDensities) {
  const size = Math.round(48 * d.scale);
  render(logoSvg, size, join(root, `android/app/src/main/res/mipmap-${d.name}/ic_launcher.png`));
  render(
    logoSvg,
    size,
    join(root, `android/app/src/main/res/mipmap-${d.name}/ic_launcher_round.png`),
  );
}

// Android adaptive icon foreground (108dp base)
for (const d of androidDensities) {
  const size = Math.round(108 * d.scale);
  render(
    fgSvg,
    size,
    join(root, `android/app/src/main/res/mipmap-${d.name}/ic_launcher_foreground.png`),
  );
}

import { render } from "solid-js/web";
import App from "./App";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "virtual:uno.css";
import "./styles/novel-reader.css";
// ── Fluent Web Components 注册 + 主题同步 ──
import { setTheme } from "@fluentui/web-components";
import { webLightTheme, webDarkTheme } from "@fluentui/tokens";
import "@fluentui/web-components/web-components.js";
import { initializeStartupPreferences } from "@/startup";

function syncFluentTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  setTheme(isDark ? webDarkTheme : webLightTheme);
}

async function bootstrap() {
  // 先恢复持久化的颜色主题，确保 <html> theme-* / .dark 在渲染前已应用
  await initializeStartupPreferences();

  syncFluentTheme();
  const observer = new MutationObserver(syncFluentTheme);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  const root = document.getElementById("root");
  if (root) {
    render(() => <App />, root);
  }
}

bootstrap().catch((e) => {
  console.error("[main] Bootstrap failed", e);
});

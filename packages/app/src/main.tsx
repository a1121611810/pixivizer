import { render } from "solid-js/web";
import App from "./App";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "virtual:uno.css";
// ── 新增: Fluent Web Components 注册 + 主题同步 ──
import { setTheme } from "@fluentui/web-components";
import { webLightTheme, webDarkTheme } from "@fluentui/tokens";
import "@fluentui/web-components/web-components.js";

function syncFluentTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  setTheme(isDark ? webDarkTheme : webLightTheme);
}
syncFluentTheme();
const observer = new MutationObserver(syncFluentTheme);
observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class"],
});
// ── 结束新增 ──

const root = document.getElementById("root");
if (root) {
  render(() => <App />, root);
}

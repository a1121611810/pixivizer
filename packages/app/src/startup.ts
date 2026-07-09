import { loadColorThemePreference } from "@/stores/themeStore";

/** 在 SolidJS 渲染前恢复启动所需的持久化偏好（目前仅颜色主题）。 */
export async function initializeStartupPreferences(): Promise<void> {
  await loadColorThemePreference();
}

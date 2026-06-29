/**
 * WebView 调试开关服务层。
 *
 * 封装 Capacitor WebDebugPlugin 调用，供 JS 层使用。
 */

/**
 * 设置 WebView 调试开关。
 * 开启后可通过 edge://inspect 或 chrome://inspect 调试 WebView。
 */
export async function setWebDebugEnabled(enabled: boolean): Promise<boolean> {
  try {
    const { WebDebug } = await import("@capacitor/core").then((mod) => ({
      WebDebug: mod.registerPlugin<any>("WebDebug"),
    }));
    const result = await WebDebug.setEnabled({ enabled });
    return result.enabled === true;
  } catch (e) {
    console.warn("[webDebugService] setEnabled failed:", e);
    return false;
  }
}

/**
 * 获取当前 WebView 调试状态。
 */
export async function getWebDebugEnabled(): Promise<boolean> {
  try {
    const { WebDebug } = await import("@capacitor/core").then((mod) => ({
      WebDebug: mod.registerPlugin<any>("WebDebug"),
    }));
    const result = await WebDebug.getIsEnabled();
    return result.enabled === true;
  } catch (e) {
    console.warn("[webDebugService] getIsEnabled failed:", e);
    return false;
  }
}

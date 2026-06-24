import type { PluginListenerHandle } from "@capacitor/core";
import { registerPlugin } from "@capacitor/core";

/**
 * Android 16 预测性返回手势开始事件。
 */
export interface PredictiveBackStartEvent {
  edge: "left" | "right";
  touchY: number;
}

/**
 * Android 16 预测性返回手势进度事件。
 */
export interface PredictiveBackProgressEvent extends PredictiveBackStartEvent {
  progress: number;
}

/**
 * PredictiveBack Capacitor 插件类型定义。
 */
export interface PredictiveBackPlugin {
  /**
   * 启用预测性返回手势监听。
   */
  enable(): Promise<void>;

  /**
   * 禁用预测性返回手势监听。
   */
  disable(): Promise<void>;

  /**
   * 结束当前 Android Activity（用于 Web 层决定真正返回时）。
   */
  finishActivity(): Promise<void>;

  /**
   * 监听预测性返回手势开始。
   */
  addListener(
    eventName: "predictiveBackStart",
    listener: (event: PredictiveBackStartEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * 监听预测性返回手势进度变化。
   */
  addListener(
    eventName: "predictiveBackProgress",
    listener: (event: PredictiveBackProgressEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * 监听预测性返回手势完成（用户松手并触发返回）。
   */
  addListener(
    eventName: "predictiveBackEnd",
    listener: (event: Record<string, never>) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * 监听预测性返回手势取消（用户未触发返回即松手）。
   */
  addListener(
    eventName: "predictiveBackCancel",
    listener: (event: Record<string, never>) => void,
  ): Promise<PluginListenerHandle>;
}

export const PredictiveBack = registerPlugin<PredictiveBackPlugin>("PredictiveBack");

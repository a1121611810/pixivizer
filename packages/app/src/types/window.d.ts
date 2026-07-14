declare global {
  interface Window {
    /** 标记当前是否有设置/系列 sheet 处于打开状态，供系统返回手势识别 */
    __settingsOpen?: boolean;
  }
}

export {};

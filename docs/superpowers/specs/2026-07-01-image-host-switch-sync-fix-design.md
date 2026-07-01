# 图床代理开关状态同步修复

- **日期**: 2026-07-01
- **状态**: 已批准
- **涉及范围**: SettingsSheet, ImageHostSettings

## 问题

设置页（SettingsSheet）中图床代理的开关视觉状态与实际的 `imageHostStore.masterEnabled` 状态不同步。在 ImageHostSettings 页面确认开启代理后，回到设置页开关仍显示为关闭。

## 根因分析

两个页面（SettingsSheet、ImageHostSettings）的 `<fluent-switch>` 都使用了不标准的 SolidJS 模式：

1. **无 `checked` 属性绑定** — `fluent-switch` 没有声明式 `checked` 属性
2. **`ref` + `createEffect` 手动同步** — 通过 `createEffect` 在 JS 中设置 `sw.checked = imageHostState().masterEnabled`

这种模式有两个问题：
- Fluent Web Components 的初始化时机可能晚于 `createEffect` 第一次执行，导致设置无效
- 组件在跨路由导航重建时，Fluent 内部状态与 SolidJS 渲染脱节

## 修复方案

### SettingsSheet.tsx

**改动**：给 `fluent-switch` 加上 `checked={imageHostState().masterEnabled}`，并在 `on:change` 中直接读取 store 状态来决定新值。

```tsx
// 改动前：ref + createEffect
let imageHostSwitchRef: HTMLElement | undefined;

createEffect(() => {
  const sw = imageHostSwitchRef as unknown as { checked?: boolean } | undefined;
  if (sw) sw.checked = imageHostState().masterEnabled;
});

<fluent-switch
  ref={imageHostSwitchRef}
  on:change={() => {
    const sw = imageHostSwitchRef as unknown as { checked?: boolean } | undefined;
    const enabled = !!sw?.checked;
    if (enabled) { closeSettingsSheet(); navigate("/image-host"); }
    else { setMasterEnabled(false); }
  }}
/>
```

```tsx
// 改动后：checked 属性绑定
<fluent-switch
  checked={imageHostState().masterEnabled}
  on:change={() => {
    if (!imageHostState().masterEnabled) {
      closeSettingsSheet();
      navigate("/image-host");
    } else {
      setMasterEnabled(false);
    }
  }}
  onClick={(e: MouseEvent) => e.stopPropagation()}
/>
```

同时移除以下无关代码：
- `imageHostSwitchRef` 变量声明
- 对应的 `createEffect` 同步块

### ImageHostSettings.tsx

**同模式修复**：给 master `fluent-switch` 加上 `checked` 属性绑定，移除 `masterSwitchRef` 和 `createEffect`。

```tsx
// 改动前：ref + createEffect + 从 ref 读状态
<fluent-switch
  ref={masterSwitchRef}
  on:change={() => {
    const sw = masterSwitchRef as unknown as { checked?: boolean } | undefined;
    handleToggle(!!sw?.checked);
  }}
/>

// 改动后：checked 属性绑定 + 从 store 读状态
<fluent-switch
  checked={imageHostState().masterEnabled}
  on:change={() => {
    handleToggle(!imageHostState().masterEnabled);
  }}
/>
```

### 边界情况

1. **SettingsSheet 切到 ON → 跳转到 `/image-host`**：此时 SolidJS 因 `checked={false}` 重渲染，开关跳回 OFF。这是正确行为——代理此时并未真正启用，用户需在 `/image-host` 确认后才会启用。
2. **Dialog 确认期间回跳**：ImageHostSettings 的 `handleToggle(true)` → dialog → `confirmEnable()` → `setMasterEnabled(true)`，dialog 显示期间开关保持 OFF，确认后变为 ON。
3. **与现有 `cancelEnable` 的交互**：`cancelEnable()` 中原来有 `sw.checked = false` 的补救代码。改用 `checked` 属性绑定后不再需要，因为 SolidJS 自动管理渲染。移除这段代码。

## 不涉及的范围

- 不修改 `imageHostStore.ts` 中的状态管理逻辑
- 不修改 `imageLoader.ts` 中图片加载逻辑
- 不修改详情页路由或组件

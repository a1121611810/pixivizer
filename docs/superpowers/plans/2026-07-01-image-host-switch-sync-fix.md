# 图床代理开关同步修复 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 SettingsSheet 和 ImageHostSettings 中图床代理 switch 的视觉状态与 `masterEnabled` 信号不同步的问题

**Architecture:** 当前的 `fluent-switch` 使用 `ref` + `createEffect` 手动同步 checked 属性，改为 SolidJS 标准的 `checked` 属性绑定后，Fluent Web Components 能正确响应状态变化

**Tech Stack:** SolidJS 1.9, Fluent Web Components, TypeScript

## Global Constraints

- 遵循现有代码风格，使用 `checklist` eslint 规则
- 只修改 SettingsSheet.tsx 和 ImageHostSettings.tsx 两个文件
- 不修改 imageHostStore.ts、imageLoader.ts 等基础逻辑

---

### Task 1: 修复 SettingsSheet 中的图床代理 switch

**Files:**
- Modify: `packages/app/src/components/SettingsSheet.tsx`

**Interfaces:**
- Consumes: `imageHostState` (signal getter from `imageHostStore`), `setMasterEnabled` (from `imageHostStore`)
- Produces: 修复后的 switch 正确显示 `imageHostState().masterEnabled` 状态

- [ ] **Step 1: 移除 `imageHostSwitchRef` 变量声明和对应的 `createEffect`**

找到 SettingsSheet 组件中的以下代码并删除：

```tsx
let imageHostSwitchRef: HTMLElement | undefined;

createEffect(() => {
  const sw = imageHostSwitchRef as unknown as { checked?: boolean } | undefined;
  if (sw) {
    sw.checked = imageHostState().masterEnabled;
  }
});
```

同时检查 `createEffect` 的 import — 如果这是该文件中唯一的 `createEffect` 用法（还有其他 createEffect，不要移除 import）。

- [ ] **Step 2: 修改 `<fluent-switch>` 添加 `checked` 属性绑定并重写 `on:change`**

原代码：

```tsx
<fluent-switch
  ref={imageHostSwitchRef}
  on:change={() => {
    const sw = imageHostSwitchRef as unknown as { checked?: boolean } | undefined;
    const enabled = !!sw?.checked;
    if (enabled) {
      closeSettingsSheet();
      navigate("/image-host");
    } else {
      setMasterEnabled(false);
    }
  }}
  aria-label="启用图床代理"
  onClick={(e: MouseEvent) => e.stopPropagation()}
/>
```

改为：

```tsx
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
  aria-label="启用图床代理"
  onClick={(e: MouseEvent) => e.stopPropagation()}
/>
```

关键变化：
- 添加 `checked={imageHostState().masterEnabled}` 属性绑定
- 移除 `ref={imageHostSwitchRef}`
- `on:change` 改用 `!imageHostState().masterEnabled` 判断要切换到的目标状态，而非从 DOM 读取 checked

- [ ] **Step 3: 验证 TypeScript 类型检查通过**

运行：
```bash
cd packages/app && npx tsc --noEmit
```
或在项目根目录：
```bash
pnpm check
```
预期：无类型错误。

- [ ] **Step 4: 提交变更**

```bash
git add packages/app/src/components/SettingsSheet.tsx
git commit -m "fix: sync image host switch checked state with store in SettingsSheet"
```

---

### Task 2: 修复 ImageHostSettings 中的 master switch

**Files:**
- Modify: `packages/app/src/routes/ImageHostSettings.tsx`

**Interfaces:**
- Consumes: `imageHostState` (signal getter from `imageHostStore`), `handleToggle` (local function)
- Produces: 修复后的 master switch 正确显示 `imageHostState().masterEnabled` 状态

- [ ] **Step 1: 移除 `masterSwitchRef` 变量声明和对应的 `createEffect`**

找到 ImageHostSettings 组件中的以下代码并删除：

```tsx
let masterSwitchRef: HTMLElement | undefined;

createEffect(() => {
  const sw = masterSwitchRef as unknown as { checked?: boolean } | undefined;
  if (sw) {
    sw.checked = imageHostState().masterEnabled;
  }
});
```

- [ ] **Step 2: 修改 `<fluent-switch>` 添加 `checked` 属性绑定并重写 `on:change`**

原代码：

```tsx
<fluent-switch
  ref={masterSwitchRef}
  on:change={() => {
    const sw = masterSwitchRef as unknown as { checked?: boolean } | undefined;
    handleToggle(!!sw?.checked);
  }}
  aria-label="启用图床代理"
/>
```

改为：

```tsx
<fluent-switch
  checked={imageHostState().masterEnabled}
  on:change={() => {
    handleToggle(!imageHostState().masterEnabled);
  }}
  aria-label="启用图床代理"
/>
```

- [ ] **Step 3: 清理 `cancelEnable` 中的手动回滚代码**

找到 `cancelEnable` 函数，移除手动设置 `sw.checked = false` 的补救代码：

```tsx
function cancelEnable() {
  setPendingEnable(false);
  setShowConfirmDialog(false);
  hideConfirmDialog();
  // 删除以下 4 行：
  // const sw = masterSwitchRef as unknown as { checked?: boolean } | undefined;
  // if (sw) {
  //   sw.checked = false;
  // }
}
```

改为：

```tsx
function cancelEnable() {
  setPendingEnable(false);
  setShowConfirmDialog(false);
  hideConfirmDialog();
}
```

- [ ] **Step 4: 如果 `masterSwitchRef` 删除后不再需要，移除可能存在的其他引用**

检查文件中 `masterSwitchRef` 是否还有其他引用。在没有其他使用的情况下（仅用于 switch 和 cancelEnable），不再需要。

同时检查 `ref={masterSwitchRef}` 是否还有在其他元素上使用（没有，仅用于 switch）。

- [ ] **Step 5: 验证 TypeScript 类型检查通过**

运行：
```bash
pnpm check
```
预期：无类型错误。

- [ ] **Step 6: 提交变更**

```bash
git add packages/app/src/routes/ImageHostSettings.tsx
git commit -m "fix: sync image host master switch checked state with store in ImageHostSettings"
```

# 性能优化修复 实现计划

**Goal:** 修复四个性能问题：消除 async 开销、SW 缓存代理路径、优化预加载、启用 Web Worker

## 实施顺序: D → B → C → A

---

### D: 消除 getEffectiveImageUrlAsync 的 async 开销

**Files:**
- Modify: `packages/app/src/utils/imageLoader.ts`

- [ ] 在 `loadImage` 中将 `await getEffectiveImageUrlAsync(originalUrl)` 改为 `getEffectiveImageUrl(originalUrl)`
- [ ] 添加 import: `getEffectiveImageUrl` from `../services/imageHostService`
- [ ] 运行 `pnpm check` 验证
- [ ] 提交

---

### B: Service Worker 缓存代理路径

**Files:**
- Modify: `packages/app/vite.config.ts`

- [ ] 在 `runtimeCaching` 中添加 `/pixiv-re/` 和 `/pixiv-nl/` 的缓存规则
- [ ] 提交

---

### C: 代理模式跳过预加载

**Files:**
- Modify: `packages/app/src/components/VirtualFeed.tsx`

- [ ] 添加 `isImageHostEnabled` 的 import
- [ ] 在预加载 createEffect 开头加 `if (isImageHostEnabled()) return;`
- [ ] 提交

---

### A: 启用 Web Worker 计算布局

**Files:**
- Modify: `packages/app/src/components/LayoutEngine.tsx`

- [ ] 导入 Worker 并通过 Comlink wrap
- [ ] 修改 `createLayout` 使用 Worker 异步计算布局
- [ ] `pnpm check` 验证
- [ ] 提交

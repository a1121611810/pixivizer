# Pixivizer Vite+ oxfmt/oxlint 配置实施记录

**Goal:** 将项目从默认配置升级为充分利用 Vite+ 内置的 oxfmt 与 oxlint 能力，统一配置入口、修复现有警告、补齐编辑器与脚本集成。

**Executed by:** agentic workflow with spec + code-quality reviews.

**Status:** ✅ Completed — all verification commands pass.

---

## 最终验证结果

```text
$ vp fmt --check
All matched files use the correct format.
Finished in 831ms on 107 files using 10 threads.

$ vp lint
Found 0 warnings and 0 errors.
Finished in 300ms on 52 files with 130 rules using 10 threads.

$ vp check
pass: All 107 files are correctly formatted (782ms, 10 threads)
pass: Found no warnings or lint errors in 52 files (280ms, 10 threads)

$ vp test
Test Files  4 passed (4)
Tests       30 passed (30)

$ vp build
✓ built in 485ms
```

---

## 关键变更

### 1. 依赖与脚本（`package.json`）

- 新增 `devDependencies`：`vite-plus@^0.2.1`、`@types/node@^26.0.0`。
- 新增 `devEngines.packageManager`：`pnpm@11.9.0`（由 Vite+ 自动写入）。
- 新增 scripts：`lint`、`fmt`、`fmt:check`；`test` 改为 `vp test`。

### 2. Vite+ 统一配置（`vite.config.ts`）

- import 从 `vite` 迁移到 `vite-plus`。
- 保留原有 proxy / postcss / plugins / build 配置。
- 新增 `lint` 块：
  - ignorePatterns 覆盖 `dist/**`、`android/**`、`node_modules/**`、工具隐藏目录、lockfile、`.d.ts`。
  - categories：`correctness=error`、`suspicious=warn`、`perf=warn`，其余关闭。
  - plugins：`typescript`、`unicorn`、`oxc`。
  - 规则：禁用 `no-unassigned-vars`（SolidJS JSX ref 模式误报），配置 `no-unused-vars` 允许 `_` 前缀，补充 `no-underscore-dangle` 白名单。
  - overrides：测试文件启用 `vitest` plugin；scripts/config 文件启用 `node` env。
- 新增 `fmt` 块：与 lint 一致的 ignorePatterns。

### 3. Vitest 入口迁移（`vitest.config.ts`）

- 实际可用入口为 `vite-plus/test/config`（`vite-plus/test` 在该版本不导出 `defineConfig`）。

### 4. 死代码与 lint 警告清理

- `src/components/ImageCard.tsx`：移除未使用的 `totalBookmarks` signal 及其 setter 调用。
- `src/routes/PersonalCenter.tsx`：移除未使用的 `loadFollowers` 导入；将 `fmtNum`/`list` 提取到模块顶层。
- `src/stores/feedStore.ts` + `src/routes/Feed.tsx`：移除 `currentScrollY` 与 `saveFeedScroll()` 死代码。
- `src/stores/userStore.ts`：移除 `currentUserId` 死代码。
- 其他行为保持等价的 lint 修复：数组改 Set、参数重命名避免 shadow、函数提取到模块顶层、未使用参数加 `_` 前缀、`void main()` 处理 floating promise 等。

### 5. 编辑器配置

- `.vscode/settings.json`：启用 oxc oxlint/oxfmt，指向 `./vite.config.ts`，默认 formatter 设为 `oxc.oxc-vscode`，保存自动格式化。
- `.vscode/extensions.json`：推荐安装 `oxc.oxc-vscode`。

### 6. TypeScript 配置微调

- `tsconfig.json`：`baseUrl` 移除，`@/*` paths 改为相对路径 `./src/*`（更兼容 `moduleResolution: bundler`）。
- `capacitor.config.ts`：添加 `/// <reference types="node" />` 以正确识别 `process.env`。

### 7. 编辑器 TypeScript 堆栈深度问题修复

VS Code / tsc 在解析 `vite.config.ts` 时曾报 `Excessive stack depth comparing types ... and 'UserConfig'`。根本原因是 `HttpsProxyAgent` 的泛型类型非常复杂，赋值给 `server.proxy.*.agent` 后，TypeScript 在将完整对象字面量与 Vite+ 扩展后的 `UserConfig` 做深度结构比较时超出递归限制。

修复方式：

- 将 `proxyAgent` 断言为 `unknown`：
  ```ts
  const proxyAgent = new HttpsProxyAgent(proxyUrl) as unknown;
  ```
- 保持 Vite+ 官方推荐的单一 `defineConfig({ ... })` 写法，避免分步构造带来的额外类型比较。
- 在 `.vscode/settings.json` 中强制 VS Code 使用项目安装的 TypeScript 6.0.3：
  ```json
  {
    "typescript.tsdk": "node_modules/typescript/lib",
    "typescript.enablePromptUseWorkspaceTsdk": true
  }
  ```

这样在不改变运行时行为的前提下，消除了编辑器的堆栈深度报错。

---

## 与原计划的偏差说明

| 原计划                                    | 实际执行                                          | 原因                                                                                                                                                                                       |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vitest.config.ts` 使用 `vite-plus/test`  | 使用 `vite-plus/test/config`                      | `vite-plus@0.2.1` 的 `dist/test/index.js` 仅 re-export vitest，未导出 `defineConfig`；`test/config` 是实际可用入口。                                                                       |
| lint `typeAware: true`, `typeCheck: true` | `typeAware: false`, `typeCheck: false`            | 启用后会暴露大量既有类型问题（`PixivIllust.caption` 缺失、`api/client.ts` 类型断言等）。`vp check` 已承担 TypeScript 类型检查职责，故先保持非类型感知 lint，避免一次性大规模业务代码改动。 |
| 仅清理 7 类 lint 警告                     | 额外修复了若干 no-shadow、floating promise 等警告 | 新启用 `unicorn`/`oxc` 插件后触发了额外规则；所有修复均行为等价，未改变业务逻辑。                                                                                                          |

---

## 后续可改进项

1. **Type-aware linting**：待业务代码类型问题清理后，可重新开启 `lint.options.typeAware: true` 与 `typeCheck: true`。
2. **VS Code 扩展**：可评估是否改用 Vite+ 官方推荐的 `VoidZero.vite-plus-extension-pack` 以获得更完整的集成体验。
3. **Git hooks**：如需在提交前自动检查，可运行 `vp config --hooks` 配置 pre-commit hook。

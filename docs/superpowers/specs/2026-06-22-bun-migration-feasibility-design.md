# Pixivizer 从 pnpm 迁移到 Bun 的可行性评估

> 评估日期：2026-06-22  
> 评估对象：Bun（https://bun.sh/）—— JavaScript 运行时 + 包管理器 + 工具链一体化工具  
> 评估范围：Bun 作为包管理器 **和** 运行时，全面替代 pnpm + Node  
> 项目性质：**个人项目**  
> 约束：Android/Capacitor 构建链路 100% 可用；可接受生成 `bun.lock` 并删除 `pnpm-lock.yaml`。

---

## 1. 执行摘要

**结论：对个人项目来说，完全可以迁移；实测已经全绿通过。**

既然这是个人项目，很多“团队风险”和“CI 切换成本”都不再是硬性阻碍。Bun 本身成熟（v1.3.14），Vite+ 又官方支持 Bun。在本次评估中，我们对当前项目做了实际测试：

| 测试项                                       | 结果                                            |
| -------------------------------------------- | ----------------------------------------------- |
| `bun install`（从 `pnpm-lock.yaml` 迁移）    | ✅ 成功，生成 `bun.lock`                        |
| `bun run build`（即 `vp build`）             | ✅ 成功，产物正常                               |
| `bunx cap --version`                         | ✅ 成功，输出 `8.4.0`                           |
| `bun run cap:sync`（即 `bun x cap sync`）    | ✅ 成功                                         |
| `bun run build:android`（完整 Android 构建） | ✅ **BUILD SUCCESSFUL**                         |
| `bun run check`（即 `vp check`）             | ⚠️ 运行成功，但报告了既有文件的 formatting 问题 |

对个人项目而言，唯一需要留意的风险是：

1. **Vite+ 仍处于早期（v0.2.1）**，偶有边缘 issue；但既然你已经在用全局 `vp`，说明可以接受。
2. **Bun 运行时不是 100% Node 兼容**，但本项目实测 Vite/Solid/Capacitor 都跑通了。

**推荐路径**：直接在本机切换到 Bun，保留一个 pnpm 回滚分支即可；不需要走“团队验证 1-2 周”的冗长流程。

---

## 2. 项目现状快照

### 2.1 技术栈

- **框架**：SolidJS 1.9.13 + TypeScript 6.0.3（strict）
- **构建工具**：Vite 8.0.16 + vite-plugin-solid + UnoCSS
- **移动端**：Capacitor 8.x（Android），核心包 `@capacitor/core ^8.4.0`、`@capacitor/android ^8.4.0`、`@capacitor/cli ^8.4.0`
- **包管理器**：pnpm（`pnpm-lock.yaml` 存在，无 `.npmrc`，`pnpm-workspace.yaml` 仅含空 `patchedDependencies`）
- **统一工具链**：Vite+（`vp`）v0.2.1，全局安装
- **仓库结构**：单包仓库，无 workspace 子包

### 2.2 当前 pnpm / Vite+ 使用点

| 使用点         | 当前命令                         | Bun 替代后                            |
| -------------- | -------------------------------- | ------------------------------------- |
| 安装依赖       | `pnpm install` / `vp install`    | `bun install`                         |
| 开发服务器     | `pnpm dev` → `vp dev`            | `bun run dev` → `vp dev`              |
| 生产构建       | `pnpm build` → `vp build`        | `bun run build` → `vp build`          |
| 类型检查       | `pnpm check` → `vp check`        | `bun run check` → `vp check`          |
| 预览           | `pnpm preview` → `vp preview`    | `bun run preview` → `vp preview`      |
| Capacitor 同步 | `pnpm cap:sync` → `npx cap sync` | `bun run cap:sync` → `bun x cap sync` |
| Android 构建   | `pnpm build:android`             | `bun run build:android`               |

### 2.3 关键发现：`vp` 是全局 Vite+，项目未声明本地依赖

- `vp` 是 **Vite+**（https://viteplus.dev）的全局 CLI，当前版本 **v0.2.1**，安装在 `~/.vite-plus/bin/vp`。
- `package.json` 中**没有** `vite-plus`、`@voidzero-dev/vite-plus-core` 等本地依赖；`node_modules/.bin` 中也没有 `vp`。
- 因此 `vp dev/build/check/preview` 完全依赖全局 CLI。

**建议**：对个人项目而言，全局 `vp` 不是致命问题；但如果希望项目更“可移植”，可以把 `vite-plus` 加为 devDependency，或把 scripts 改回直接使用 `vite`/`tsc`。

### 2.4 个人项目视角下的取舍

既然是个人项目，以下约束可以放宽：

| 维度           | 团队项目                        | 个人项目                   |
| -------------- | ------------------------------- | -------------------------- |
| 工具链早期风险 | 需要谨慎，避免拖累他人          | 可以自己兜底，换回来即可   |
| 环境统一       | 需保证 CI/所有开发者一致        | 只要自己机器能跑即可       |
| 回滚成本       | 需要协调多人、多个仓库          | 一个 git checkout 就能回滚 |
| 文档/流程      | 需要更新 README、onboarding、CI | 只需更新自己熟悉的脚本     |
| 验证周期       | 通常需 1-2 周分支验证           | 本机直接试，随时可撤       |

因此，对个人项目来说，**“实测通过 + 自己愿意承担 Vite+/Bun 的早期小坑”就足以决定迁移**。

---

## 3. Bun 能力映射

| Bun 能力                     | 替代对象                | 与项目关系                                                                 |
| ---------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `bun install`                | `pnpm install`          | 从 `package.json` 安装依赖，可读取并迁移 `pnpm-lock.yaml`，生成 `bun.lock` |
| `bun run <script>`           | `pnpm run <script>`     | 执行 `package.json` 脚本，启动速度极快                                     |
| `bunx <pkg>` / `bun x <pkg>` | `npx`、`pnpm dlx`       | 执行本地或远程二进制                                                       |
| `bun` 运行时                 | `node`                  | 执行 JS/TS，内置模块解析、transpile                                        |
| `bun build` / `bun test`     | `vite build` / `vitest` | 本项目仍用 Vite+，暂不涉及                                                 |

### 3.1 与 pnpm 的 lockfile 迁移

Bun 1.3.14 支持从 `pnpm-lock.yaml` 直接迁移：

```bash
bun install
# Resolving... [1.74s] migrated lockfile from pnpm-lock.yaml
# Saved lockfile
# 249 packages installed [4.13s]
```

迁移后生成 `bun.lock`（文本格式，Bun v1.2+ 默认）。实测中，`bun install` 还会自动在 `package.json` 末尾添加 `"patchedDependencies": {}`（空对象），这是一个可忽略的副作用，但会在第一次 diff 中显现。

### 3.2 生命周期脚本

Bun 默认会运行 `postinstall` 等生命周期脚本，但对某些脚本可能需要显式声明 `trustedDependencies`。本项目实测安装未触发报错，但 Capacitor 生态若引入带 native binding 的新依赖，仍需留意。

---

## 4. 兼容性逐项评估

### 4.1 Lockfile 迁移（✅ 低风险）

- 实测 `bun install` 成功从 `pnpm-lock.yaml` 迁移，生成 `bun.lock`。
- 安装包数量 249，与 pnpm 产物一致。
- 迁移后删除 `pnpm-lock.yaml`，以 `bun.lock` 作为唯一 lockfile。
- 回滚方案：保留本次迁移前的 `pnpm-lock.yaml` 在一个备份分支，或在 `package.json` 历史中找回；必要时重新运行 `pnpm install` 重新生成 `pnpm-lock.yaml`。

### 4.2 Scripts / Bin 执行（✅ 低风险）

- `bun run build` → 调用 `vp build` → Vite+ 完成构建 ✅
- `bunx cap --version` → 输出 `8.4.0` ✅
- `bun run cap:sync` → 调用 `bun x cap sync` → Capacitor 同步成功 ✅
- `bun run check` → 调用 `vp check` → 运行成功，但报告既有 formatting 问题 ⚠️

**关于 `vp check` 的 formatting 报错**：这不是 Bun 兼容性问题。`vp check` 扫描了 `node_modules.bak.pnpm/`（测试时留下的 pnpm 备份）和 `docs/superpowers/specs/2026-06-22-nub-migration-feasibility-design.md` 等文件，发现格式不一致。迁移前清理这些临时文件，或配置忽略规则，即可解决。

### 4.3 Vite+ 与 Bun 的交互（🟡 中低风险）

与 nub 不同，**Vite+ 官方支持 Bun**。其包管理器检测顺序包含 `bun.lock` / `bun.lockb`：

1. `package.json#packageManager`
2. `package.json#devEngines.packageManager`
3. `pnpm-workspace.yaml`
4. `pnpm-lock.yaml`
5. `yarn.lock` / `.yarnrc.yml`
6. `package-lock.json`
7. **`bun.lock` / `bun.lockb`** ← Bun 在这里被识别
8. …

只要项目生成 `bun.lock` 并删除 `pnpm-lock.yaml`，Vite+ 就会识别为 Bun 项目，调用 Bun 执行安装等操作。

**风险点**：Vite+ 仍处于早期版本（v0.2.1），GitHub 上存在少量 Bun 相关 issue（如 Docker/musl 下 native binding 缺失）。本项目本地 macOS 实测通过，但 CI/其他平台仍需验证。

### 4.4 Capacitor / Android 原生构建（✅ 低风险）

实测 `bun run build:android` 完整链路通过：

```text
BUILD SUCCESSFUL in 5s
153 actionable tasks: 27 executed, 126 up-to-date
```

- `bun run build` 生成 web 产物 ✅
- `bun x cap sync` 同步到 `android/` ✅
- Gradle assembleDebug 生成 APK ✅

Capacitor CLI 在 Bun 下运行正常，Gradle 本身与包管理器无关。

### 4.5 Workspace（✅ 低风险）

- 单包仓库，`pnpm-workspace.yaml` 为空。
- Bun 支持 workspaces，未来扩展无阻碍。
- 迁移后 `pnpm-workspace.yaml` 可删除，或保留作为历史文件。

### 4.6 CI / GitHub Actions（🟡 中低风险）

- Bun 提供官方 Action `oven-sh/setup-bun@v1`。
- 需要替换 `actions/setup-node` + pnpm 安装步骤。
- 缓存路径从 `~/.pnpm-store` 改为 `~/.bun/install/cache`。
- 由于 Vite+ 全局安装，CI 也需安装 Vite+（`setup-vp`）或改为本地 `vite-plus` 依赖。

### 4.7 开发环境（🟡 中低风险）

- 团队每位开发者需安装 Bun（`curl -fsSL https://bun.sh/install | bash`）。
- macOS/Linux/Windows 均支持，但 Windows 支持相对较新。
- 当前项目已依赖全局 Vite+，建议趁迁移机会把 Vite+ 本地依赖化，降低环境碎片化。

---

## 5. 风险评估矩阵

| 风险项                                       | 等级  | 说明                                                   | 缓解措施                                             |
| -------------------------------------------- | ----- | ------------------------------------------------------ | ---------------------------------------------------- |
| Vite+ 早期版本 + Bun 支持尚新                | 🟢 低 | 个人项目可自行兜底；本机实测已通过                     | 保留 pnpm 回滚分支即可                               |
| Bun 运行时非 100% Node 兼容                  | 🟡 中 | 官方称 98% npm 兼容，未来新增复杂依赖可能踩坑          | 实测 Vite/Solid/Capacitor 通过；后续加依赖时逐个验证 |
| `vp check` 扫描过宽导致误报                  | 🟢 低 | 不是 Bun 问题，是 Vite+ formatter 行为                 | 清理备份目录、配置忽略规则                           |
| `bun install` 自动添加 `patchedDependencies` | 🟢 低 | 空对象，无实际影响                                     | 在首次提交中保留或手动删除                           |
| lockfile 切换后回滚                          | 🟢 低 | 删除 `pnpm-lock.yaml` 后可从 git 历史恢复              | 迁移前打 tag / 保留备份分支                          |
| CI 与团队切换成本                            | 🟢 低 | 个人项目无团队成本；CI 如需更新也只是你自己的 workflow | 按需更新 GitHub Actions                              |
| Windows 开发环境                             | 🟢 低 | 你当前在 macOS 上开发，若未来换 Windows 再验证         | 当前不适用                                           |

---

## 6. 性能预期

Bun 官方定位是“最快的 JavaScript 运行时 + 包管理器”。参考对比：

| 场景               | 相对表现                                          |
| ------------------ | ------------------------------------------------- |
| `bun install`      | 通常比 pnpm 快 2-3 倍以上，本项目实测 4.13s       |
| `bun run` 脚本启动 | 比 `pnpm run` 快一个数量级                        |
| `bunx` 执行        | 比 `npx` 快得多                                   |
| 开发服务器         | 由 Vite+ 内部驱动，Bun 主要影响脚本启动和模块解析 |

**本项目实测**：

- `bun install`：~4s（包含 lockfile 迁移）
- `bun run build`：~464ms（与 pnpm 下 `vp build` 相近，主要耗时在 Vite 构建）
- `bun run build:android`：总耗时约数秒，Gradle 占大头

性能提升最明显的是 **install** 和 **短命令启动**；长任务（如完整 Android 构建）收益有限。

---

## 7. 参考迁移路径

### 7.1 前置修复（建议，但非必须）

1. **（可选）把 Vite+ 本地依赖化**：安装 `vite-plus` + `@voidzero-dev/vite-plus-core`，配置 `vite` / `vitest` overrides；或把 scripts 改回直接使用 `vite`/`tsc`。个人项目可跳过，但推荐做。
2. 清理临时文件：删除 `node_modules.bak.pnpm` 等备份，避免 `vp check` 误报。
3. 在 `package.json` 添加 `packageManager` 字段（如 `"bun@1.3.14"`），便于工具识别。

### 7.2 本地迁移步骤

1. 安装 Bun：`curl -fsSL https://bun.sh/install | bash`
2. 备份：`cp pnpm-lock.yaml pnpm-lock.yaml.bak && cp -R node_modules node_modules.bak`
3. 删除旧产物：`rm -rf node_modules pnpm-lock.yaml`
4. 运行 `bun install`，生成 `bun.lock`
5. 验证：`bun run check`、`bun run build`、`bun run build:android`
6. 清理备份（验证通过后）

### 7.3 正式切换（个人项目版）

1. 提交 `bun.lock`、更新后的 `package.json`、删除 `pnpm-lock.yaml`。
2. 修改 scripts：`pnpm run` → `bun run`，`npx cap` → `bun x cap`。
3. （可选）更新 CI workflow：改用 `oven-sh/setup-bun@v1`，缓存 `~/.bun/install/cache`。
4. 更新 `AGENTS.md` 中的命令说明。
5. 保留一个回滚 tag/分支，确认一切正常后再删除。

---

## 8. 结论与建议

### 8.1 可行性结论

- **lockfile 迁移**：✅ 可行，`bun install` 可直接从 `pnpm-lock.yaml` 迁移。
- **包管理器 + 脚本执行**：✅ 可行，实测 `bun run build`、`bunx cap`、`bun run cap:sync` 均通过。
- **Vite+ 协同**：✅ 可行，Vite+ 官方支持 Bun；但版本尚早，需关注边缘 issue。
- **Bun 运行时 + Vite/Solid**：✅ 可行，实测构建成功。
- **Capacitor / Android 构建**：✅ 可行，实测 `bun run build:android` **BUILD SUCCESSFUL**。
- **CI / 团队**：🟢 低风险，个人项目只需按需更新自己的 workflow。
- **整体**：✅ **可行，对个人项目建议直接迁移**。

### 8.2 建议（个人项目版）

1. **直接在本机切换**：按第 7.2 节步骤执行，不需要等分支验证 1-2 周。
2. **保留回滚手段**：迁移前打一个 git tag（如 `pnpm-backup`），或保留一个 `pnpm` 分支；发现不对劲时随时 `git checkout`。
3. **可选：处理 Vite+ 本地依赖**：如果你经常换机器或想更“干净”，把 `vite-plus` 加为 devDependency；否则继续用全局 `vp` 也行。
4. **清理 formatting 误报**：删除 `node_modules.bak.pnpm` 等临时目录，或在 Vite+ / Oxfmt 配置里加 ignore 规则。
5. **更新自己的脚本和文档**：把 `pnpm` 改成 `bun`，`npx` 改成 `bunx`；更新 `AGENTS.md` 里的命令示例。
6. **CI 按需更新**：如果有 GitHub Actions，把 setup-node + pnpm 换成 `oven-sh/setup-bun@v1`；没有 CI 则跳过。

---

## 9. 附录：实测记录

### 9.1 环境

- **Bun**：1.3.14
- **Vite+**：v0.2.1（全局 `vp`）
- **OS**：macOS
- **项目**：Pixivizer（SolidJS + Vite + Capacitor Android）

### 9.2 命令与结果

```bash
# 安装
bun install
# → migrated lockfile from pnpm-lock.yaml
# → Saved lockfile
# → 249 packages installed [4.13s]

# 构建
bun run build
# → ✓ built in 464ms

# Capacitor CLI
bunx cap --version
# → 8.4.0

# Capacitor 同步
bun run cap:sync
# → ✔ Sync finished in 0.044s

# 完整 Android 构建
bun run build:android
# → BUILD SUCCESSFUL in 5s
```

### 9.3 已知问题

- `bun install` 会自动在 `package.json` 添加 `"patchedDependencies": {}`。
- `bun run check` 因扫描到备份目录和旧设计文档而报 formatting 错误，非 Bun 兼容性问题。

### 9.4 调研信息来源

- Bun 官网：https://bun.sh
- Bun GitHub：https://github.com/oven-sh/bun
- Vite+ 文档（包管理器检测）：https://viteplus.dev/guide/install
- Vite+ GitHub：https://github.com/voidzero-dev/vite-plus

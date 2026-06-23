# Pixivizer 从 pnpm 迁移到 nub 的可行性评估

> 评估日期：2026-06-22  
> 评估对象：nub（https://nubjs.com/）—— 基于 Rust 的 Node.js 一体化工具包  
> 约束：必须保留现有 `pnpm-lock.yaml` 且可回滚；必须保证 Android/Capacitor 构建链路 100% 可用。

---

## 1. 执行摘要

**结论：技术上部分可行，但当前不建议切换；nub 与项目当前的 Vite+（`vp`）工具链存在直接冲突。**

nub 本身对 pnpm lockfile 的兼容声明、更快的 install 与脚本启动、以及内置 Node 版本管理，对单包仓库确实有吸引力。然而项目当前脚本大量依赖 **Vite+（`vp`）**——一个会主动接管并“包装”底层包管理器的统一工具链。Vite+ 官方只支持 `pnpm`、`npm`、`yarn`、`bun` 四种包管理器，**未提及 nub**。这意味着：

- 只要 `pnpm-lock.yaml` 还在，Vite+ 就会把自己当成 pnpm 项目，继续调用 pnpm；
- 若把底层换成 nub，Vite+ 要么找不到 pnpm 而失败，要么需要绕过 Vite+ 直接调用 `nub run`；
- 绕过 Vite+ 意味着项目会失去 `vp dev/build/check` 这条统一入口，迁移意义大打折扣。

再加上 nub 正式发布仅约一周、Vite+ 也处于 v0.2.1 的早期阶段，两个极新工具叠加的风险过高。建议**暂不迁移**，优先观察 nub 与 Vite+ 的后续兼容性进展。

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

| 使用点         | 当前命令                         | 说明                                                     |
| -------------- | -------------------------------- | -------------------------------------------------------- |
| 安装依赖       | `pnpm install` / `vp install`    | Vite+ 会检测 `pnpm-lock.yaml` 并调用 pnpm                |
| 开发服务器     | `pnpm dev` → `vp dev`            | `vp dev` 是 Vite+ 内置命令                               |
| 生产构建       | `pnpm build` → `vp build`        | 同上                                                     |
| 类型检查       | `pnpm check` → `vp check`        | 同上，Vite+ 会走 lint + format + type-check              |
| 预览           | `pnpm preview` → `vp preview`    | 同上                                                     |
| Capacitor 同步 | `pnpm cap:sync` → `npx cap sync` | 使用 `npx`                                               |
| Android 构建   | `pnpm build:android`             | 串联 `pnpm build`、`pnpm cap:sync`、Gradle assembleDebug |

### 2.3 关键发现：`vp` 是全局 Vite+，项目未声明本地依赖

- `vp` 是 **Vite+**（https://viteplus.dev）的全局 CLI，当前版本 **v0.2.1**，安装在 `~/.vite-plus/bin/vp`。
- `package.json` 中**没有** `vite-plus`、`@voidzero-dev/vite-plus-core` 等本地依赖；`node_modules/.bin` 中也没有 `vp`。
- 因此 `vp dev/build/check/preview` 完全依赖全局 CLI 的 Vite+ 运行时，项目本身并未把 Vite+ 作为确定性依赖锁定。

**风险**：这本身就是一项技术债——新成员或 CI 若未安装 Vite+，脚本无法运行。无论是否迁移到 nub，都建议先把 Vite+ 本地依赖化（`vite-plus` + `@voidzero-dev/vite-plus-core`），或把脚本改回直接使用 `vite`。

### 2.4 Vite+ 的包管理器包装机制

Vite+ 不是简单的 `vite` 别名，而是一个会**接管包管理器调用**的统一入口。它通过以下顺序检测项目使用的包管理器：

1. `package.json#packageManager`
2. `package.json#devEngines.packageManager`
3. `pnpm-workspace.yaml`
4. `pnpm-lock.yaml`
5. `yarn.lock` / `.yarnrc.yml`
6. `package-lock.json`
7. `bun.lock` / `bun.lockb`
8. …

官方文档明确说明支持 **pnpm、npm、Yarn、Bun**，没有提到 nub。检测到包管理器后，`vp install/add/remove` 等命令会调用对应的实际包管理器；`packageManager` / `devEngines.packageManager` 还会影响 `node`、`npm`、`pnpm`、`yarn`、`bun` 等 shim 的解析。

**关键推论**：只要项目保留 `pnpm-lock.yaml`，Vite+ 就会把项目识别为 pnpm 项目。即使底层换成 nub，Vite+ 仍会尝试调用 pnpm。

---

## 3. nub 能力映射

nub 是一个 Rust 编写的 CLI，目标是替代 `node`、`npm/pnpm/yarn`、`npx`、`nvm/fnm`、`corepack` 等。与 Pixivizer 相关的核心能力如下：

| nub 命令                 | 替代对象                                          | 与项目关系                                                  |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------------------- |
| `nub install` / `nub ci` | `pnpm install` / `pnpm install --frozen-lockfile` | 声称 pnpm 兼容，可读写 `pnpm-lock.yaml`                     |
| `nub run <script>`       | `pnpm run <script>`                               | 脚本启动更快（官方称 ~24×），保留 workspace 与生命周期钩子  |
| `nubx <bin>`             | `npx`、`pnpm exec`、`pnpm dlx`                    | 本地 `.bin` 优先，否则从 registry 拉取                      |
| `nub node install/pin`   | `nvm`、`fnm`                                      | 根据 `.node-version` / `package.json#engines` 自动下载 Node |
| `nub pm use/shim`        | corepack                                          | 管理并路由 npm/pnpm/yarn/bun 的精确版本                     |
| `nub watch <file>`       | `nodemon`、`node --watch`                         | 本项目暂不涉及                                              |

### 3.1 与 pnpm 的兼容性声明

nub 官方文档强调：

- **lockfile 往返**：npm、pnpm、Bun 的 lockfile 可读写；Yarn 只读。
- **配置兼容**：在 pnpm 项目上，nub 会读取并遵循 pnpm 的配置面，包括 workspace 文件、hooks、`package.json#pnpm`、npm 环境变量等。
- **无 lock-in**：没有 `nub:*` 模块、没有 nub 专属 lockfile、没有 nub 专属配置字段。

### 3.2 生命周期脚本策略

nub 对依赖构建脚本（postinstall 等）采用 **deny-by-default**：

- 只有显式允许（`pnpm.onlyBuiltDependencies`、`trustedDependencies`、`nub approve-builds`）才会执行；
- 或通过 registry provenance、advisory vetting、冷却窗口等默认信任机制。

**影响**：Capacitor 生态中的某些原生模块（`@capacitor/android` 本身通常不需要 postinstall，但相关工具链可能依赖）若依赖 postinstall 脚本，需要被列入允许清单，否则安装后产物可能不完整。

---

## 4. 兼容性逐项评估

### 4.1 Lockfile（✅ 低风险）

- 项目已有 `pnpm-lock.yaml`。
- nub 声称可直接读取并写回同格式文件，无需转换。
- 在“lockfile 不变且可回滚”这一约束下，nub 单独看是满足条件的。

**验证建议**：运行 `nub install` 后，用 `git diff pnpm-lock.yaml` 检查 nub 是否意外改写格式或版本元数据。

### 4.2 Scripts / Bin 执行（⚠️ 中风险）

- `nub run dev/build/check/preview` 可替代 `pnpm run`，但脚本内部调用的是 `vp`，需先解决 Vite+ 本地依赖问题。
- `npx cap sync` 可替换为 `nubx cap sync`；`npx cap open android` 可替换为 `nubx cap open android`。
- 若绕过 Vite+，直接把 scripts 改成 `nub run vite` / `nubx cap sync`，则日常命令需要从 `vp dev` 变成 `nub run dev`，开发者体验有落差。

### 4.3 Vite+ 与 nub 的交互（🔴 高风险）

这是本次评估中**最关键的冲突点**。

| 场景                                           | 预期行为                                                                                | 风险                          |
| ---------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------- |
| 保留 `pnpm-lock.yaml`，仅把 install 换成 nub   | Vite+ 仍识别为 pnpm 项目，`vp install` 会尝试调用 pnpm                                  | 若未装 pnpm，会失败           |
| 删除 `pnpm-lock.yaml` 让 Vite+ 走默认          | Vite+ 默认仍回退到 pnpm；同时破坏 lockfile 不变约束                                     | 不可接受                      |
| 设置 `packageManager: "nub@..."`               | Vite+ 官方不支持 nub，可能报未知包管理器                                                | 不可行                        |
| 使用 `nub pm shim`                             | `nub pm shim` 只会按 `packageManager` 字段下载真正的 pnpm，并不会把 pnpm 调用路由到 nub | 不能解决 Vite+ / nub 协同问题 |
| 通过 shell alias 或 symlink 把 `pnpm` 指向 nub | 可欺骗 Vite+，但极度依赖个人环境，CI/团队不可复现                                       | 不推荐                        |
| 绕过 Vite+，全部改用 `nub run` / `nubx`        | 可行，但失去 Vite+ 统一入口                                                             | 迁移意义大打折扣              |

**结论**：nub 与 Vite+ 目前没有原生协同方案。可行的路只有两条：要么放弃 Vite+ 统一入口、全面改用 `nub run` / `nubx`；要么依赖 shell alias/symlink 等不可靠的环境级 hack。后者不适合团队项目。

### 4.4 Capacitor / Android 原生构建（⚠️ 中高风险）

- `pnpm build:android` 链路：Web 构建 → `cap sync` → Gradle assembleDebug。
- `cap sync` 会操作 `android/` 目录下的文件；`nubx cap sync` 理论上行为一致，但需要实测。
- Gradle 本身不依赖包管理器，但 Capacitor CLI 及其插件的解析路径必须正确。
- 若某些 transitive 依赖有 postinstall 脚本且被 nub 默认阻止，可能导致 `android/` 产物异常。

**验证建议**：在干净环境中用 nub 安装后执行完整 `build:android`，对比 APK 是否能正常生成并运行。

### 4.5 Workspace（✅ 低风险）

- `pnpm-workspace.yaml` 为空，无实际 workspace 子包。
- nub 支持 workspaces，未来若扩展 workspace 也不构成迁移阻碍。

### 4.6 CI / GitHub Actions（⚠️ 中风险）

- nub 提供 `nubjs/setup-nub@v0` Action，可替代 `actions/setup-node`。
- 需要验证该 action 在当前项目中的稳定性，尤其是缓存 Nub store 与 Node toolchain 的行为。
- 由于 nub 很新，GitHub Marketplace 上的版本迭代可能较快，存在 action 接口变动的风险。
- 若项目继续使用 Vite+，CI 还需要额外安装 Vite+（`setup-vp`）。

### 4.7 开发环境（⚠️ 中风险）

- 团队每位开发者需在本地安装 nub（`npm install -g --ignore-scripts=false @nubjs/nub` 或官方 install 脚本）。
- 若使用 `nub pm shim`，裸 `pnpm` 命令会被路由到项目 pin 的版本；不启用 shim 则需要开发者主动使用 `nub` 命令。
- 由于 nub 是全局二进制，团队成员需要统一安装方式与版本。
- 当前项目已依赖全局 Vite+，若再叠加全局 nub，开发环境会变得更加碎片化。

---

## 5. 风险评估矩阵

| 风险项                         | 等级      | 说明                                                         | 缓解措施                                               |
| ------------------------------ | --------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| **Vite+ 不支持 nub**           | 🔴 **高** | Vite+ 只支持 pnpm/npm/yarn/bun，`vp` 会按 pnpm 项目调用 pnpm | 绕过 Vite+ 或等待官方支持；迁移前必须做 PoC            |
| nub 版本过新、生态实践少       | 🔴 高     | 2026-06-15 才发布，issue/StackOverflow/社区经验极少          | 不立即全切；先在本地/分支验证 1-2 周                   |
| Vite+ 本身也处于早期（v0.2.1） | 🟡 中     | 两个早期工具叠加，排错更困难                                 | 优先把 Vite+ 本地依赖化，降低全局版本不确定性          |
| 生命周期脚本被默认禁用         | 🟡 中     | Capacitor/原生工具链若依赖 postinstall 会失败                | 安装后检查构建产物；必要时配置 `onlyBuiltDependencies` |
| `vp` / Vite+ 未作为本地依赖    | 🟡 中     | 脚本依赖全局 CLI，移植性差                                   | 无论是否迁移，都建议本地安装 `vite-plus` 或改回 `vite` |
| CI action 接口不稳定           | 🟡 中     | `setup-nub` 可能快速迭代                                     | 固定 action 主版本或先用本地 shell 安装                |
| lockfile 格式意外变更          | 🟢 低     | nub 声称 pnpm lockfile 可往返                                | 迁移后立即 diff lockfile                               |
| 回滚成本                       | 🟢 低     | 不转换 lockfile，随时可切回 pnpm                             | 保留 `packageManager` 切换记录                         |

---

## 6. 性能预期

nub 官方给出的 benchmark（macOS，warm frozen install，create-t3-app，222 deps）：

| 工具 | 耗时               |
| ---- | ------------------ |
| nub  | 1122 ms            |
| Bun  | 1444 ms（慢 29%）  |
| pnpm | 2847 ms（慢 2.5×） |
| npm  | 4163 ms（慢 3.7×） |

脚本启动：`nub run` 称比 `pnpm run` 快约 24×；`nubx` 比 `npx` 快约 19×。

**本项目实际情况**：

- 依赖数量远少于 create-t3-app，install 提升比例可能不如官方显著，但绝对耗时会更短。
- 开发阶段 `pnpm dev` 的启动时间主要消耗在 Vite/Vite+ 编译，nub 的脚本启动优势对长进程影响有限；对频繁运行的 `nubx cap` 等短命令收益更明显。
- **必须实测**：不要仅凭官方数据做决策。
- **注意**：若继续保留 Vite+，Vite+ 自身的启动与解析开销可能会抵消 nub 的脚本启动优势。

---

## 7. 参考迁移路径（如后续决定实施）

本节仅作为可行性评估的延伸，不展开为完整实施计划。由于 Vite+ 目前不支持 nub，任何实施都需要先解决二者协同问题。

### 7.1 前置修复（强烈建议，无论是否迁移）

1. **把 Vite+ 本地依赖化**：安装 `vite-plus` + `@voidzero-dev/vite-plus-core`，并在 `pnpm-workspace.yaml` 或 `package.json` 中配置 `vite` / `vitest` 的 overrides。
2. 或者**把 scripts 改回直接使用 `vite`**：`vp dev` → `vite`，`vp build` → `vite build`，`vp check` → `tsc --noEmit` 等，彻底摆脱对 Vite+ 的依赖。
3. 检查并记录当前哪些依赖依赖 postinstall 脚本。

### 7.2 本地验证（若仍想尝试 nub）

1. 安装 nub：`npm install -g --ignore-scripts=false @nubjs/nub`。
2. 备份 `pnpm-lock.yaml`。
3. 运行 `nub install`，检查 lockfile diff。
4. 选择一种 Vite+ / nub 协同方案验证：
   - **方案 A**：绕过 Vite+，直接运行 `nub run dev` / `nub run build` / `nubx cap sync` / `nub run build:android`。
   - **方案 B**（实验性）：先把 scripts 中的 `vp` 替换为 `vite`/`tsc` 等确定性命令，再运行 `nub run dev/build/check`。
5. 对比 `node_modules` 结构、产物、`android/app/build/outputs/apk/debug/*.apk`。

### 7.3 正式切换（只有在 PoC 成功后）

1. 在 `package.json` 添加/更新 `packageManager` 字段（如 `nub@^0.x` 或通过 `nub pm use` 管理）。
2. 修改 scripts：`pnpm run` → `nub run`，`npx cap` → `nubx cap`；若保留 Vite+，则 nub 只能用于脚本运行层，无法接管 Vite+ 内部的包管理器调用。
3. 更新 CI workflow：`actions/setup-node` → `nubjs/setup-nub@v0`。
4. 更新 `AGENTS.md` 中的命令说明。

---

## 8. 结论与建议

### 8.1 可行性结论

- **lockfile 不变与回滚**：✅ 可行，nub 官方支持 pnpm lockfile 往返。
- **日常开发脚本**：⚠️ 可行但需先处理 Vite+ 依赖问题，并且 nub 与 Vite+ 没有原生协同。
- **Vite+ / nub 协同**：❌ **目前不可行，除非完全绕过 Vite+**，这是最大 blocker。
- **Capacitor / Android 构建**：⚠️ 大概率可行，但需要完整实测。
- **团队与 CI**：⚠️ 可行，但 nub 与 Vite+ 均处于极早期，风险叠加。
- **整体**：🔴 **不建议现在迁移**。

### 8.2 建议

1. **暂不迁移到 nub**：当前 nub 与 Vite+ 的兼容性不足，迁移收益无法覆盖风险。
2. **先修复 Vite+ 本地依赖问题**：把 `vite-plus` 声明为 devDependency，或把 scripts 改回直接使用 `vite`；这不仅为将来迁移铺平道路，也能解决当前项目脚本不可移植的问题。
3. **关注 nub 与 Vite+ 的兼容性进展**：特别留意 Vite+ 是否会在后续版本支持 nub 作为包管理器。
4. **若未来 Vite+ 支持 nub 或项目脱离 Vite+**：再按第 7 节做本地 PoC，验证 `nub install` + `nub run build:android`。
5. **若只是追求脚本启动速度**：可以考虑保留 pnpm install，仅把 `npx cap` 换成 `nubx cap` 做局部尝试，但收益有限。

---

## 附录：调研信息来源

- nub 官方博客：https://nubjs.com/blog/introducing-nub（发布于 2026-06-15）
- nub 文档：https://nubjs.com/docs
- nub GitHub：https://github.com/nubjs/nub
- Vite+ 官网：https://viteplus.dev
- Vite+ 文档（包管理器检测）：https://viteplus.dev/guide/install
- Vite+ GitHub：https://github.com/voidzero-dev/vite-plus

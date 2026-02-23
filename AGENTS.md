# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-23
**Project:** pixiv-tauri (Tauri + Vue 3 Desktop App)

## OVERVIEW

Tauri 2 + Vue 3 桌面应用模板，使用 Bun 作为包管理器。

## STRUCTURE

```
./
├── src/                    # 前端 Vue 3
│   ├── main.js            # Vue 入口
│   ├── App.vue            # 根组件
│   └── assets/            # 静态资源
├── src-tauri/             # Rust 后端
│   ├── src/
│   │   ├── main.rs        # Rust 入口
│   │   └── lib.rs         # 命令定义
│   ├── Cargo.toml         # Rust 依赖
│   ├── tauri.conf.json    # Tauri 配置
│   └── capabilities/      # 权限配置
├── public/                 # 公共资源
├── vite.config.js         # Vite 配置
└── package.json           # 前端依赖
```

## WHERE TO LOOK

| 任务 | 位置 | 备注 |
|------|------|------|
| 添加前端组件 | `src/App.vue` | Vue 3 SFC |
| 添加 Rust 命令 | `src-tauri/src/lib.rs` | 使用 `#[tauri::command]` |
| 修改窗口配置 | `src-tauri/tauri.conf.json` | 窗口大小、标题等 |
| 添加依赖 | `package.json` (前端) / `Cargo.toml` (后端) |

## CONVENTIONS

- **包管理器**: Bun (`bun run dev/build`)
- **前端入口**: `src/main.js` → `App.vue`
- **后端入口**: `src-tauri/src/main.rs` → `lib.rs::run()`
- **Tauri 命令**: 使用 `#[tauri::command]` 宏，JS 端用 `invoke()` 调用

## ANTI-PATTERNS (THIS PROJECT)

- **禁止删除**: `src-tauri/src/main.rs` 第1行注释 (`DO NOT REMOVE`)
- **CSP 禁用**: `tauri.conf.json` 中 `"csp": null` 生产环境需修复
- **无测试**: 项目未配置任何测试框架

## UNIQUE STYLES

- 使用 Bun 而非 npm/yarn/pnpm
- Tauri 2.x (最新版本)
- 固定开发端口 1420
- 忽略 `src-tauri` 目录的文件监听

## COMMANDS

```bash
bun run dev        # 启动 Vite 开发服务器
bun run build      # Vite 生产构建
bun run preview   # 预览构建结果
bun run tauri     # Tauri CLI
bun run tauri dev # 启动 Tauri 开发模式
bun run tauri build # 构建桌面应用
```

## NOTES

- 初始模板状态，仅有一个示例 `greet` 命令
- 无 TypeScript 配置
- 无 ESLint/Prettier 配置
- 无 CI/CD 流水线
- 窗口默认 800x600

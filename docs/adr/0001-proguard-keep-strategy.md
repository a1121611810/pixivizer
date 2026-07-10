# ADR-0001: ProGuard Keep Strategy — 精确注解 keep

Release 构建启用 `minifyEnabled true`，使用 R8 全优化模式。原生代码仅 3 个 Capactor 插件类（MainActivity、PictelioHttpPlugin、PredictiveBackPlugin），由 Capactor 框架通过 `@CapacitorPlugin` 注解反射发现。

## 决定

用**一条** `-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }` 覆盖所有插件，不加额外 keep 规则。`DohDns`（直接引用实现 `okhttp3.Dns` 接口）会由 R8 跟踪调用链自动保留。

## 考虑到但拒绝的选项

- **宽泛 keep 整个包**（`-keep class io.pictelio.app.** { *; }`）——放弃了对 3 个 Java 类之外暂无代码的命名空间的混淆，无必要。
- **逐个列插件名**——每次新增插件需同步更新，易遗漏。
- **不加任何 keep**——Capacitor 框架通过反射发现插件，R8 会移除未被直接引用的注解类，运行时报错。已验证不可行。

## 影响

- `proguard-rules.pro` 增加 3 行有效规则，约 2 行注释说明
- 构建速度：首次 R8 全开约慢 5-8 秒，后续增量约 1-2 秒
- APK 大小：预计减少 15-25%（主要受益于 OkHttp 等库的 unused code 裁剪）

# ADR-0002: SSRF 防护 — Java 层 Host 白名单 + CI 验证一致性

`PictelioHttpPlugin.request()` 接收 WebView JS 传过来的任意 URL，通过 OkHttp 直发。无校验意味着任何 XSS 漏洞都能利用此桥访问内网、云元数据端点或局域网服务。

## 决定

两层校验：

**Java 层**——`PictelioHttpPlugin` 内维护 `private static final Set<String> ALLOWED_HOSTS = Set.of("app-api.pixiv.net", "i.pximg.net")`，`request()` 入口对 URL 做 `new URI(url).getHost()` 匹配白名单，不匹配直接 `call.reject()`。

**JS 层 CI 验证**——Vitest 断言 `rewriteUrl("https://app-api.pixiv.net/...") → "/pixiv-api/..."`，间接验证 JS 侧 `PIXIV_API_BASE` 常量与 Java 侧白名单一致。

白名单需要同时更新两处。但这 3 个字符串变更概率极低，改动两处的成本几乎为零。

## 考虑到但拒绝的选项

- **资源文件唯一源**（`res/values/strings.xml` → JS 通过 `getAllowedHosts()` 桥读取）——为了"单一源"引入新的跨层插件通信通道，增加攻击面，与修复 SSRF 的意图矛盾。
- **构建时注入 assets**——Capacitor 构建流程长，依赖链复杂，管理 3 个字符串不值得。

## 影响

- Java 层：增加约 10 行（import `URI`、`Set` + 校验逻辑 + reject）
- JS 层：零行改动（已有 `rewriteUrl()` 约束域名）
- 运行时校验开销：`URI` 解析约 0.01ms，忽略不计

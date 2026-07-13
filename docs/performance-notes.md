# Performance Notes

## Blob URL vs Proxy URL for LRU Cache Display

Blob URL 在 Runtime 上并不是 0 成本。

### Benchmark

通过 Playwright 在 headless Chromium 中的测试结果：

| 指标 | blob: URL | 代理 URL（浏览器 HTTP 缓存） |
|------|----------|---------------------------|
| 显示延迟（中位数） | ~0.50 ms | **~0.00 ms** |
| 额外成本 | `URL.createObjectURL` + Blob → 跨语言边界解码 | 无 |
| Network 面板条目 | ✅ 出现一条 `blob:` 条目 | ❌ 不出现 |

### 原因

- **blob URL**：每次设置 `<img src="blob:xxx">` 时，浏览器从 JS 堆读取 Blob 数据，经过跨语言边界，再解码。
- **代理 URL**：浏览器 HTTP 缓存命中的图片，解码后的 bitmap 已经在 C++ 层缓存，直接复用。

### 决策

`checkImageCache()`、`loadImage()`、`loadImageWithProgress()` 在缓存命中时统一返回代理 URL（`/pixiv-img/xxx.jpg`），不走 blob URL。

LRU 缓存内部仍存储 Blob，用于：
- Native ImageCache 的 base64 编码（磁盘持久化）
- `checkImageCache()` 的真值判断（缓存存在性检查）
- 启动时 `warmCacheFromDisk` 的 LRU 预热

### 测试时间

2026-07-13，Playwright chromium, 3 images × 10 iterations.

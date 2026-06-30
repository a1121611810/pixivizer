# Native Request Interception Architecture Decision

## Overview

Analysis of why WebView-level native request interception (Java `shouldInterceptRequest`) is used in the release APK, and why JS-only alternatives are insufficient for Pixiv image CDN requests.

## Problem

Pictelio needs to load images from `i.pximg.net` (Pixiv's image CDN), which requires:
- `Referer: https://app-api.pixiv.net/` header for authorization
- `User-Agent: PixivIOSApp/...` header

In a Capacitor WebView running in release APK, cross-origin requests from JS `fetch()` to `i.pximg.net` are blocked by CORS. Headers cannot be injected into `<img>` tag-initiated loads.

## Decision

**Keep Java `WebViewClient.shouldInterceptRequest()` for `/pixiv-img/` interception**, with one optimization: change image proxying from buffered to streaming.

## Architecture

```
Release APK WebView:
  JS fetch → CapacitorHttp → Native HTTP → Pixiv API / GitHub API ✅ (already pure JS)
  <img src="/pixiv-img/..."> → WebView resource load
    → Java shouldInterceptRequest()
    → HttpURLConnection(i.pximg.net, Referer, User-Agent)
    → InputStream → WebResourceResponse (streaming) ✅
    → WebView renders directly
```

## Alternatives Evaluated

### Pure JS (CapacitorHttp + Blob URL) ❌ Rejected
- Requires every `<img>` tag (ImageViewer, ImageCard, PersonalCenter, UgoiraViewer, DebugImage) to be refactored to JS-loaded Blob URLs
- Each image incurs Capacitor bridge overhead (Base64 serialization + decode)
- High implementation cost with no functional benefit over current approach

### Service Worker ❌ Rejected
- Cannot inject custom headers on cross-origin requests (`mode: 'no-cors'` strips non-simple headers)
- Cannot bypass CORS for cross-origin requests with `mode: 'cors'`
- Android WebView SW support varies across ROMs and versions

### Local HTTP Proxy Server ❌ Rejected
- Adds NanoHTTPD dependency (~60KB) + port management + lifecycle complexity
- Android-only; iOS needs separate implementation
- Current `shouldInterceptRequest` approach achieves the same result with zero extra dependencies

## Optimization

Fix current `interceptImage()` to stream the response directly instead of buffering the entire image into `ByteArrayOutputStream` first:

```java
// Before (memory: 2x image size)
ByteArrayOutputStream buffer = new ByteArrayOutputStream();
byte[] data = new byte[8192];
int n;
while ((n = input.read(data)) != -1) buffer.write(data, 0, n);
input.close();
return new WebResourceResponse(mime, encoding, new ByteArrayInputStream(buffer.toByteArray()));

// After (memory: zero additional, stream directly)
return new WebResourceResponse(mime, encoding, conn.getInputStream());
```

## Files Affected

- `packages/app/android/app/src/main/java/io/pictelio/app/MainActivity.java` — optimize streaming
- Remove dead `/github-api/` intercept code (JS already uses `CapacitorHttp` directly)

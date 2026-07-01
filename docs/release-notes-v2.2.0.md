# v2.2.0

## Recommended Feed

- Sub-tabs for Mixed, Illust, and Manga.
- Scroll position preserved across tab switches.
- Guards against rapid-switching race conditions.

## Image Host Proxy

- Configurable upstream image hosts.
- Race mode probes all hosts for fastest CDN.
- Single mode locks to a specific host.
- Background cache expiry detection.

## DNS over HTTPS

- Experimental DoH toggle for Android.
- Powered by OkHttp and custom PictelioHttpPlugin.

## Settings

- Bottom sheet replaced with left-side drawer.
- Unified spacing across sections.

## Skeleton Screen

- Placeholder cards during initial load.

## Grid & Single Column

- Dedicated GridCard with avatar, username, and follow button.
- Fixes row-height miscalculation in grid layout.
- Fixes Y-position formula in single-column layout.

## Performance

- Masonry layout offloaded to Web Worker.
- Proxy latency reduced.
- Redundant refresh removed on layout switch.

## Bug Fixes

- Image host switch reliably syncs with UI.
- Fluent Web Component compatibility fixes.
- Radio group desync on programmatic changes fixed.
- Stale waterfall cache cleared on layout switch.
- GridCard styling matches ImageCard.
- Scroll position loss on pull-to-refresh fixed.
- Various imageHostStore persistence fixes.



# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── Capacitor 插件 keep 规则 ──
# Capacitor 通过 @CapacitorPlugin 注解反射发现插件类。
# R8 全优化模式下会移除未直接引用的类，此规则保留所有带该注解的类。
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# ── OkHttp ──
# OkHttp 4.12.0 AAR 内自带 consumer-rules.pro，R8 会自动合并。
# DohDns 通过 new DohDns() 直接实例化，R8 能追踪调用链自动保留。
# 无需额外规则。

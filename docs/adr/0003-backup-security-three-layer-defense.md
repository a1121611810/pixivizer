# ADR-0003: 备份安全 — 三层防护策略

`android:allowBackup="true"` 允许 `adb backup` 和云备份导出应用私有数据。refresh_token 经 `@aparajita/capacitor-secure-storage` 存入 Android Keystore，但备份时加密数据和密钥材料一并打包。OEM 厂商可能忽略 `dataExtractionRules` 中的排除项。

## 决定

不粗暴关闭备份（保留非敏感数据恢复能力），用三层密码防线：

**层①** `res/xml/data_extraction_rules.xml` 排除 `SecurePrefs.xml`（Android 12+ 标准路径）
**层②** `res/xml/backup_rules.xml` 同步排除，由 `AndroidManifest` 的 `android:fullBackupContent` 引用（覆盖 Android 12 以下、以及走旧路径的设备）
**层③** `secureStorage.ts` 启动时写入 `backup_marker`，每次启动检查其存在性——如果备份排除被忽略导致旧备份覆盖新安装，`backup_marker` 会被抹去或失效（Keystore 绑定设备 ID），触发 wipe token + 强制重新登录。

## 额外的安全关注

已确认 `@aparajita/capacitor-secure-storage` 底层使用 EncryptedSharedPreferences + Android KeyStore。在 Android 7+ 上密钥材料由硬件 KeyStore 保护，备份导出后无法在另一设备解密。但为避免 risk of OEM 实现差异，层③提供了 defence-in-depth。

## 考虑到但拒绝的选项

- **直接 `android:allowBackup="false"`**——用户在换机或重装后丢失所有数据（token、设置、收藏缓存、阅读进度），体验劣化过大。`backup_marker` 自检已提供等效安全性。
- **仅 deprecation 注释提醒**——不可靠，Android 15 已标记 `allowBackup` 为 deprecated 但老版本仍需显式配置。

## 影响

- 新增 2 个 XML 文件（`data_extraction_rules.xml`、`backup_rules.xml`）
- 新增约 15 行备份自检代码（`secureStorage.ts`）
- 启动时自检开销约 1ms（单次 Keystore 读操作）
- AndroidManifest 改动 2 行：`android:dataExtractionRules`、`android:fullBackupContent`

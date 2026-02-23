# Pixiv 第三方客户端 - 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完成 Pixiv 第三方客户端 MVP 版本开发，支持浏览、搜索、小说、下载等功能

**Architecture:** 
- 前端: Vue 3 + Varlet UI + Pinia (纯 JavaScript)
- 后端: Rust Tauri 处理 Token 存储和 API 代理
- 认证: OAuth 2.0 + Token 自动刷新

**Tech Stack:** Tauri 2.x, Vue 3, Varlet UI, Pinia, JavaScript

---

## 阶段 1: 项目初始化

### Task 1.1: 初始化 Git 仓库并创建工作树

**Files:**
- Create: `.gitignore`

**Step 1: 初始化 Git**

```bash
git init
git add .
git commit -m "chore: initial commit - Tauri + Vue 3 template"
```

**Step 2: 创建功能分支**

```bash
git checkout -b feature/pixiv-mvp
```

---

### Task 1.2: 配置 Tauri 支持多平台

**Files:**
- Modify: `src-tauri/tauri.conf.json`

**Step 1: 修改 tauri.conf.json 支持安卓**

```json
{
  "bundle": {
    "targets": ["msi", "nsis", "deb", "rpm", "appimage", "dmg", "android"]
  }
}
```

**Step 2: 添加安卓权限配置**

Create: `src-tauri/capabilities/android.json`

```json
{
  "identifier": "android",
  "description": "Android capability",
  "windows": [],
  "permissions": ["core:default", "opener:default"]
}
```

---

### Task 1.3: 安装前端依赖

**Files:**
- Modify: `package.json`

**Step 1: 添加 Varlet UI、Pinia、Vue Router**

```bash
bun add @varlet/ui @varlet/vue-router pinia vue-router@4
```

---

### Task 1.4: 配置 Varlet UI

**Files:**
- Modify: `src/main.js`

**Step 1: 配置 Varlet**

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import { 
  Button, 
  Card, 
  Cell, 
  Image as VarImage,
  Tabbar,
  TabbarItem,
  NavBar,
  Tab,
  Tabs,
  Search,
  Loading,
  Icon,
  PullRefresh,
  List,
  Popup,
  ActionSheet,
  Dialog,
  Toast,
  Switch,
  Divider,
  Tag,
  Avatar,
  Badge,
  Row,
  Col,
  Lazy
} from '@varlet/ui'
import '@varlet/ui/themes/dark.css'
import { createPinia } from 'pinia'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(Lazy)
;[
  Button, Card, Cell, VarImage, Tabbar, TabbarItem,
  NavBar, Tab, Tabs, Search, Loading, Icon,
  PullRefresh, List, Popup, ActionSheet, Dialog,
  Toast, Switch, Divider, Tag, Avatar, Badge, Row, Col
].forEach(component => {
  app.use(component)
})

app.mount('#app')
```

---

## 阶段 2: 路由与状态管理

### Task 2.1: 创建路由配置

**Files:**
- Create: `src/router/index.js`
- Create: `src/views/Home.vue`
- Create: `src/views/Ranking.vue`
- Create: `src/views/Search.vue`
- Create: `src/views/IllustDetail.vue`
- Create: `src/views/NovelDetail.vue`
- Create: `src/views/NovelReader.vue`
- Create: `src/views/Profile.vue`
- Create: `src/views/Favorites.vue`
- Create: `src/views/Settings.vue`
- Modify: `src/main.js`

**Step 1: 创建路由文件**

Create: `src/router/index.js`

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/ranking', name: 'Ranking', component: () => import('../views/Ranking.vue') },
  { path: '/search', name: 'Search', component: () => import('../views/Search.vue') },
  { path: '/illust/:id', name: 'IllustDetail', component: () => import('../views/IllustDetail.vue') },
  { path: '/novel/:id', name: 'NovelDetail', component: () => import('../views/NovelDetail.vue') },
  { path: '/novel/:id/read', name: 'NovelReader', component: () => import('../views/NovelReader.vue') },
  { path: '/user/:id', name: 'Profile', component: () => import('../views/Profile.vue') },
  { path: '/favorites', name: 'Favorites', component: () => import('../views/Favorites.vue') },
  { path: '/settings', name: 'Settings', component: () => import('../views/Settings.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

**Step 2: 在 main.js 中注册路由**

```javascript
import router from './router'

app.use(router)
```

---

### Task 2.2: 创建 Pinia Stores

**Files:**
- Create: `src/stores/auth.js`
- Create: `src/stores/illust.js`
- Create: `src/stores/novel.js`
- Create: `src/stores/user.js`

**Step 1: 创建认证 Store**

Create: `src/stores/auth.js`

```javascript
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const isLoggedIn = computed(() => !!user.value)
  
  async function login() {
    // 调用 Tauri 命令进行 OAuth 登录
    const { invoke } = window.__TAURI__.core
    const result = await invoke('start_oauth')
    user.value = result.user
  }
  
  async function logout() {
    const { invoke } = window.__TAURI__.core
    await invoke('clear_token')
    user.value = null
  }
  
  async function checkLogin() {
    const { invoke } = window.__TAURI__.core
    try {
      const result = await invoke('get_user_info')
      user.value = result
    } catch (e) {
      user.value = null
    }
  }
  
  return { user, isLoggedIn, login, logout, checkLogin }
})
```

---

## 阶段 3: Rust 后端 - 认证模块

### Task 3.1: 添加 Rust 依赖

**Files:**
- Modify: `src-tauri/Cargo.toml`

**Step 1: 添加依赖**

```toml
[dependencies]
reqwest = { version = "0.12", features = ["json", "cookies"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
base64 = "0.22"
tauri = { version = "2", features = ["opener"] }
log = "0.4"
env_logger = "0.11"
```

---

### Task 3.2: 实现 OAuth 认证命令

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: 添加 OAuth 相关代码**

```rust
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
struct PixivToken {
    access_token: String,
    refresh_token: String,
    expires_in: i64,
}

struct AppState {
    token: Mutex<Option<PixivToken>>,
}

#[tauri::command]
async fn start_oauth(app: tauri::AppHandle) -> Result<String, String> {
    // 1. 打开 Pixiv OAuth 授权页面
    // 2. 监听回调
    // 3. 获取 token 并存储
    // 4. 返回用户信息
    Ok("oauth_url".to_string())
}

#[tauri::command]
async fn get_user_info(state: tauri::State<'_, AppState>) -> Result<serde_json::Value, String> {
    // 使用 token 获取用户信息
    Ok(serde_json::json!({
        "id": 123456,
        "name": "Test User",
        "account": "test_user"
    }))
}

#[tauri::command]
async fn refresh_token(state: tauri::State<'_, AppState>) -> Result<(), String> {
    // 刷新 access_token
    Ok(())
}

#[tauri::command]
async fn clear_token(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut token = state.token.lock().map_err(|e| e.to_string())?;
    *token = None;
    Ok(())
}

#[tauri::command]
async fn call_pixiv_api(
    state: tauri::State<'_, AppState>,
    endpoint: String,
    params: std::collections::HashMap<String, String>,
) -> Result<String, String> {
    // 调用 Pixiv API 并返回结果
    Ok("{}".to_string())
}
```

---

## 阶段 4: 首页与排行榜

### Task 4.1: 实现首页布局

**Files:**
- Modify: `src/App.vue`

**Step 1: 创建基础布局**

```vue
<template>
  <div class="app-container">
    <var-nav-bar title="Pixiv" safe-area>
      <template #left>
        <var-icon name="menu" @click="show = true" />
      </template>
      <template #right>
        <var-icon name="account-circle" @click="goTo('/profile')" />
        <var-icon name="cog" @click="goTo('/settings')" />
      </template>
    </var-nav-bar>
    
    <div class="content">
      <router-view />
    </div>
    
    <var-tabbar v-model="active" @change="onTabChange">
      <var-tabbar-item icon="home" to="/">首页</var-tabbar-item>
      <var-tabbar-item icon="fire" to="/ranking">排行</var-tabbar-item>
      <var-tabbar-item icon="magnify" to="/search">搜索</var-tabbar-item>
      <var-tabbar-item icon="heart" to="/favorites">收藏</var-tabbar-item>
    </var-tabbar>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const active = ref(0)

function goTo(path) {
  router.push(path)
}
</script>

<style>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
  overflow-y: auto;
}
</style>
```

---

### Task 4.2: 实现首页推荐

**Files:**
- Modify: `src/views/Home.vue`

**Step 1: 创建首页组件**

```vue
<template>
  <div class="home">
    <var-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <!-- 轮播图 -->
      <var-swipe class="swipe" :autoplay="3000">
        <var-swipe-item v-for="item in banners" :key="item.id">
          <var-image :src="item.url" object-fit="cover" />
        </var-swipe-item>
      </var-swipe>
      
      <!-- 推荐列表 -->
      <div class="illust-grid">
        <var-image-card
          v-for="item in illusts"
          :key="item.id"
          :src="item.image"
          :title="item.title"
          @click="goToDetail(item.id)"
        />
      </div>
    </var-pull-refresh>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const refreshing = ref(false)
const banners = ref([])
const illusts = ref([])

function goToDetail(id) {
  router.push(`/illust/${id}`)
}

async function loadData() {
  // TODO: 调用 API 获取数据
}

async function onRefresh() {
  await loadData()
  refreshing.value = false
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.home {
  padding: 10px;
}
.swipe {
  height: 200px;
  border-radius: 8px;
}
.illust-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-top: 10px;
}
</style>
```

---

## 阶段 5: 搜索功能

### Task 5.1: 实现搜索页面

**Files:**
- Modify: `src/views/Search.vue`

**Step 1: 创建搜索组件**

```vue
<template>
  <div class="search">
    <var-search
      v-model="keyword"
      placeholder="搜索插画/小说"
      @search="onSearch"
    />
    
    <var-tabs v-model:active="activeTab">
      <var-tab name="illust">插画</var-tab>
      <var-tab name="novel">小说</var-tab>
    </var-tabs>
    
    <div class="results">
      <!-- 搜索结果列表 -->
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const keyword = ref('')
const activeTab = ref('illust')

function onSearch() {
  // TODO: 调用搜索 API
}
</script>
```

---

## 阶段 6: 小说模块

### Task 6.1: 实现小说阅读器

**Files:**
- Modify: `src/views/NovelReader.vue`

**Step 1: 创建阅读器组件**

```vue
<template>
  <div class="reader">
    <var-nav-bar :title="novel.title" left-arrow @click-left="router.back()" />
    
    <div class="content" :style="{ fontSize: fontSize + 'px' }">
      <p v-for="(text, index) in novel.texts" :key="index">
        {{ text }}
      </p>
    </div>
    
    <div class="controls">
      <var-button @click="fontSize -= 2">A-</var-button>
      <var-button @click="fontSize += 2">A+</var-button>
      <var-button @click="download">下载</var-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const fontSize = ref(16)
const novel = ref({ title: '', texts: [] })

function download() {
  // TODO: 调用 Rust 下载命令
}
</script>

<style scoped>
.reader {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1;
  padding: 20px;
  line-height: 1.8;
  overflow-y: auto;
}
.controls {
  padding: 10px;
  display: flex;
  gap: 10px;
}
</style>
```

---

## 阶段 7: 下载功能

### Task 7.1: 实现 Rust 下载命令

**Files:**
- Modify: `src-tauri/src/lib.rs`

**Step 1: 添加下载命令**

```rust
#[tauri::command]
async fn download_image(
    url: String,
    path: String,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // 1. 使用 reqwest 下载图片
    // 2. 保存到指定路径
    Ok(())
}

#[tauri::command]
async fn download_novel(
    content: String,
    path: String,
) -> Result<(), String> {
    // 保存小说文本到文件
    std::fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn select_save_path(
    default_name: String,
) -> Result<String, String> {
    // 使用系统对话框选择保存路径
    // 需要添加 tauri-plugin-dialog 依赖
    Ok(default_name)
}
```

---

## 阶段 8: 用户模块

### Task 8.1: 实现收藏与关注

**Files:**
- Modify: `src/stores/user.js`

**Step 1: 创建用户 Store**

```javascript
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const favorites = ref([])
  const following = ref([])
  
  async function addFavorite(illustId) {
    // 调用 API 添加收藏
  }
  
  async function removeFavorite(illustId) {
    // 调用 API 取消收藏
  }
  
  async function followUser(userId) {
    // 调用 API 关注用户
  }
  
  async function unfollowUser(userId) {
    // 调用 API 取消关注
  }
  
  async function loadFavorites() {
    // 获取收藏列表
  }
  
  return { favorites, following, addFavorite, removeFavorite, followUser, unfollowUser, loadFavorites }
})
```

---

## 阶段 9: 测试与打包

### Task 9.1: 构建桌面端

**Step 1: 构建命令**

```bash
# Windows
bun run tauri build

# Android
bun run tauri build --target aarch64-linux-android
```

---

## 执行方式

**Plan complete and saved to `docs/plans/2026-02-23-pixiv-mvp-plan.md`.**

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**

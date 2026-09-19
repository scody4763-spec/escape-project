<template>
  <div class="layout">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed }">
      <div class="logo">
        <el-icon class="logo-icon"><Connection /></el-icon>
        <span v-show="!collapsed" class="logo-text">AIoT Platform</span>
      </div>

      <nav class="nav">
        <template v-for="item in navItems" :key="item.path">
          <!-- 有子菜单的项 -->
          <el-dropdown v-if="item.children" trigger="click" placement="right-start" popper-class="nav-dropdown">
            <div
              class="nav-item"
              :class="{ active: item.children.some(c => route.path.startsWith(c.path)) }"
            >
              <el-tooltip :content="item.label" placement="right" :disabled="!collapsed">
                <el-icon><component :is="item.icon" /></el-icon>
              </el-tooltip>
              <span v-show="!collapsed">{{ item.label }}</span>
              <el-icon v-show="!collapsed" class="nav-arrow"><arrow-down /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="child in item.children" :key="child.path" @click="router.push(child.path)">
                  {{ child.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 普通导航项 -->
          <router-link
            v-else
            :to="item.path"
            class="nav-item"
            :class="{ active: route.path.startsWith(item.path) }"
          >
            <el-tooltip :content="item.label" placement="right" :disabled="!collapsed">
              <el-icon><component :is="item.icon" /></el-icon>
            </el-tooltip>
            <span v-show="!collapsed">{{ item.label }}</span>
            <el-badge v-if="item.badge && item.badge > 0" :value="item.badge" class="nav-badge" />
          </router-link>
        </template>
      </nav>

      <button class="collapse-btn" @click="collapsed = !collapsed">
        <el-icon><d-arrow-left v-if="!collapsed" /><d-arrow-right v-else /></el-icon>
      </button>
    </aside>

    <!-- Main -->
    <div class="main">
      <header class="header">
        <div class="header-left">
          <div class="breadcrumb-path">
            <el-icon style="color: #6366f1"><component :is="currentNav?.icon" /></el-icon>
            <span>{{ currentNav?.label }}</span>
          </div>
        </div>
        <div class="header-right">
          <!-- 语言切换 -->
          <el-dropdown @command="handleLanguageChange" trigger="click">
            <span class="language-switcher">
              <!-- <el-icon><Globe /></el-icon> -->
              <span>{{ settings.languageName }}</span>
              <el-icon><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="zh-CN">中文</el-dropdown-item>
                <el-dropdown-item command="en-US">English</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <!-- 主题切换 -->
          <el-tooltip :content="settings.themeName">
            <el-button
              circle
              size="small"
              @click="settings.toggleTheme"
              :type="settings.theme === 'dark' ? 'primary' : 'default'"
            >
              <el-icon v-if="settings.theme === 'light'"><Sunny /></el-icon>
              <el-icon v-else><Moon /></el-icon>
            </el-button>
          </el-tooltip>

          <div class="time-display">{{ currentTime }}</div>
          <div class="divider" />
          
          <el-dropdown @command="onCommand">
            <div class="user-btn">
              <el-avatar :size="28" style="background: #6366f122; color: #6366f1">
                <el-icon><UserFilled /></el-icon>
              </el-avatar>
              <span>Admin</span>
              <el-icon class="arrow"><arrow-down /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">Profile</el-dropdown-item>
                <el-dropdown-item command="settings">Settings</el-dropdown-item>
                <el-dropdown-item command="logout" :icon="SwitchButton">Logout</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <!-- 页签栏 -->
      <div class="tabs-bar" v-if="settings.showTabs">
        <div class="tabs-container">
          <div class="tabs-scroll">
            <div
              v-for="tab in tabs"
              :key="tab.key"
              class="tab-item"
              :class="{ active: tab.key === activeTab }"
              @click="switchTab(tab)"
              @contextmenu.prevent="onTabContextMenu($event, tab)"
            >
              <span>{{ tab.title }}</span>
              <el-icon
                v-if="tab.closable"
                class="close-icon"
                @click.stop="closeTab(tab)"
              >
                <Close />
              </el-icon>
            </div>
          </div>
          <div class="tabs-actions">
            <el-dropdown @command="handleTabAction" trigger="click">
              <el-button size="small" type="text">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="refresh">Refresh</el-dropdown-item>
                  <el-dropdown-item command="closeOther">Close Others</el-dropdown-item>
                  <el-dropdown-item command="closeAll">Close All</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <main class="content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted as onMountedHook, onUnmounted }from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTabsStore } from '@/stores/tabs'
import { useSettingsStore } from '@/stores/settings'
import { ElMessageBox } from 'element-plus'
import { SwitchButton } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const tabsStore = useTabsStore()
const settings = useSettingsStore()

const collapsed = ref(false)
const currentTime = ref('')

const navItems = [
  { path: '/dashboard', label: '数据总览', icon: 'DataBoard' },
  { path: '/floor-model', label: '楼层模型', icon: 'OfficeBuilding' },
  { path: '/sensors', label: '指示灯', icon: 'Cpu' },
  { path: '/realtime', label: '指示灯实时数据', icon: 'Monitor' },
  { path: '/ceiling-lights', label: '吸顶灯', icon: 'Sunny' },
  { path: '/ceiling-light-realtime', label: '吸顶灯实时数据', icon: 'Monitor' },
  { path: '/boards', label: '控制板', icon: 'Grid' },
  { path: '/signboards', label: '显示板', icon: 'Monitor' },
  { path: '/alerts', label: '设备告警', icon: 'Bell' },
  // { path: '/notifications', label: '通知日志', icon: 'ChatDotRound' },
  { path: '/reports', label: '数据报表', icon: 'TrendCharts', children: [
    { path: '/reports/sensor', label: '指示灯报表' },
    { path: '/reports/ceiling-light', label: '吸顶灯报表' }
  ]},
  { path: '/users', label: '用户管理', icon: 'User' }
]

const currentNav = computed(() => 
  navItems.find(nav => route.path.startsWith(nav.path))
)

// 页签相关
const tabs = computed(() => tabsStore.tabs)
const activeTab = computed(() => tabsStore.activeTab)

const switchTab = (tab) => {
  router.push(tab.path)
  tabsStore.setActiveTab(tab.key)
}

const closeTab = (tab) => {
  // Dashboard页签不可关闭
  if (tab.name === 'Dashboard') {
    return
  }
  tabsStore.removeTab(tab.key)
}

const handleTabAction = (command) => {
  switch (command) {
    case 'refresh':
      // 刷新当前页签
      router.go(0)
      break
    case 'closeOther':
      tabsStore.closeOtherTabs(activeTab.value)
      break
    case 'closeAll':
      tabsStore.closeAllTabs()
      router.push('/dashboard')
      break
  }
}

// const onTabContextMenu = (event, tab) => {
//   // 实现右键菜单
//   console.log('Tab context menu:', tab, event)
// }

// 语言切换
const handleLanguageChange = (lang) => {
  settings.setLanguage(lang)
}

// 用户命令处理
const onCommand = async (cmd) => {
  if (cmd === 'logout') {
    try {
      await ElMessageBox.confirm('Are you sure you want to logout?', 'Confirm', {
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        type: 'warning'
      })
      auth.clearAuth()
      tabsStore.clearTabs()
      router.push('/login')
    } catch {
      // 用户取消
    }
  } else if (cmd === 'profile') {
    // 跳转到个人中心
    router.push('/profile')
  } else if (cmd === 'settings') {
    // 打开设置
    console.log('打开设置')
  }
}

// 更新时间
const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

onMountedHook(() => {
  // 启动时钟
  updateTime()
  const timer = setInterval(updateTime, 1000)
  
  // 监听路由变化，自动添加页签
  const unwatch = router.afterEach((to) => {
    if (to.name && to.name !== 'Login') {
      tabsStore.addTab(to)
    }
  })
  
  // 清理
  onUnmounted(() => {
    clearInterval(timer)
    unwatch()
  })
})

// 初始化时添加当前路由到页签
onMountedHook(() => {
  if (route.name && route.name !== 'Login') {
    tabsStore.addTab(route)
  }
})
</script>

<style scoped>
.layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
  background: var(--el-bg-color-page);
}

/* 侧边栏样式 */
.sidebar {
  width: 220px;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  transition: all 0.3s ease;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
  min-width: 64px;
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;
  border-bottom: 1px solid var(--el-border-color);
  overflow: hidden;
}

.logo-icon {
  font-size: 22px;
  color: #6366f1;
  flex-shrink: 0;
  filter: drop-shadow(0 0 6px rgba(99, 102, 241, 0.5));
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: #6366f1;
  white-space: nowrap;
  letter-spacing: 1.5px;
}

.nav {
  flex: 1;
  padding: 10px 0;
  overflow-y: auto;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 18px;
  color: var(--el-text-color-regular);
  text-decoration: none;
  font-size: 13.5px;
  white-space: nowrap;
  border-left: 3px solid transparent;
  transition: all 0.15s;
}

.nav-item:hover {
  background: var(--el-fill-color-light);
  color: #6366f1;
}

.nav-item.active {
  background: rgba(99, 102, 241, 0.08);
  color: #6366f1;
  border-left-color: #6366f1;
}

.collapse-btn {
  margin: 10px 12px;
  padding: 8px;
  background: none;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: 0.2s;
}

.collapse-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
}

.nav-arrow {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  transition: transform 0.2s;
}

:deep(.nav-dropdown) {
  --el-dropdown-menuItem-hover-color: #6366f1;
}

/* 页签栏样式 */
.tabs-bar {
  height: 40px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.tabs-container {
  display: flex;
  align-items: center;
  height: 100%;
  flex: 1;
  overflow: hidden;
}

.tabs-scroll {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  flex: 1;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-item:hover {
  background: var(--el-fill-color);
}

.tab-item.active {
  background: var(--el-color-primary);
  color: white;
  border-color: var(--el-color-primary);
}

.tab-item .close-icon {
  opacity: 0;
  transition: opacity 0.2s;
}

.tab-item:hover .close-icon {
  opacity: 1;
}

.tabs-actions {
  margin-left: 8px;
}

/* 头部样式 */
.header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumb-path {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.language-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.language-switcher:hover {
  background: var(--el-fill-color-light);
}

.time-display {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: 'Courier New', monospace;
}

.divider {
  width: 1px;
  height: 20px;
  background: var(--el-border-color);
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}

.user-btn:hover {
  background: var(--el-fill-color-light);
}

.arrow {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 主内容区 */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
</style>
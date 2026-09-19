import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

// 多页签存储
export const useTabsStore = defineStore('tabs', () => {
  const router = useRouter()
  const route = useRoute()
  
  // 打开的页签列表
  const tabs = ref([])
  // 当前激活的页签
  const activeTab = ref('')
  
  // 从路由信息创建页签对象
  function createTabFromRoute(route) {
    const matchedRoute = route.matched.find(r => r.name)
    if (!matchedRoute) return null
    
    // Dashboard 路由不可关闭
    const isDashboard = route.name === 'Dashboard'
    
    return {
      key: route.fullPath,
      name: route.name,
      title: route.meta?.title || route.name,
      path: route.fullPath,
      closable: !isDashboard // 只有Dashboard不可关闭
    }
  }
  
  // 添加页签
  function addTab(route) {
    const tab = createTabFromRoute(route)
    if (!tab) return
    
    // 检查是否已存在相同页签
    const existingTab = tabs.value.find(t => t.key === tab.key)
    if (existingTab) {
      activeTab.value = tab.key
      return
    }
    
    tabs.value.push(tab)
    activeTab.value = tab.key
  }
  
  // 移除页签
  function removeTab(key) {
    const index = tabs.value.findIndex(tab => tab.key === key)
    if (index === -1) return
    
    const tab = tabs.value[index]
    
    // 检查是否尝试关闭Dashboard页签
    if (tab.name === 'Dashboard') {
      console.warn('Dashboard页签不可关闭')
      return
    }
    
    tabs.value.splice(index, 1)
    
    // 如果移除的是当前激活的页签，需要激活另一个页签
    if (activeTab.value === key) {
      if (tabs.value.length > 0) {
        // 优先激活前一个页签，如果没有则激活后一个
        const newIndex = Math.max(0, index - 1)
        activeTab.value = tabs.value[newIndex].key
        router.push(tabs.value[newIndex].path)
      } else {
        // 如果没有页签了，跳转到首页
        activeTab.value = ''
        router.push('/dashboard')
      }
    }
  }
  
  // 关闭其他页签
  function closeOtherTabs(key) {
    const tab = tabs.value.find(t => t.key === key)
    if (!tab) return
    
    // 获取Dashboard页签
    const dashboardTab = tabs.value.find(t => t.name === 'Dashboard')
    
    // 要保留的页签列表
    const tabsToKeep = [tab]
    
    // 如果当前页签不是Dashboard，且Dashboard页签存在，则也保留Dashboard
    if (tab.name !== 'Dashboard' && dashboardTab) {
      tabsToKeep.push(dashboardTab)
    }
    
    tabs.value = tabsToKeep
    activeTab.value = tab.key
  }
  
  // 关闭所有页签
  function closeAllTabs() {
    // 始终保留Dashboard页签，如果不存在则创建
    let dashboardTab = tabs.value.find(t => t.name === 'Dashboard')
    
    if (!dashboardTab) {
      // 创建Dashboard页签
      dashboardTab = {
        key: '/dashboard',
        name: 'Dashboard',
        title: '数据总览',
        path: '/dashboard',
        closable: false
      }
    }
    
    // 只保留Dashboard页签
    tabs.value = [dashboardTab]
    activeTab.value = dashboardTab.key
    router.push(dashboardTab.path)
  }
  
  // 刷新当前页签
  function refreshTab() {
    const currentPath = activeTab.value
    if (!currentPath) return
    
    // 通过重新导航来刷新页面
    router.push({ path: '/redirect', query: { redirect: currentPath } })
  }
  
  // 监听路由变化自动添加页签
  function watchRouteChange() {
    if (route.name && route.name !== 'Login') {
      addTab(route)
    }
  }
  
  // 设置活动页签
  function setActiveTab(key) {
    activeTab.value = key
  }
  
  // 清空页签
  function clearTabs() {
    tabs.value = []
    activeTab.value = ''
  }
  
  return {
    tabs,
    activeTab,
    addTab,
    removeTab,
    closeOtherTabs,
    closeAllTabs,
    refreshTab,
    watchRouteChange,
    setActiveTab,
    clearTabs
  }
})
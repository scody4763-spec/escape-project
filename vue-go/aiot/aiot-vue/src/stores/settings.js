import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// 应用设置存储（语言、主题等）
export const useSettingsStore = defineStore('settings', () => {
  // 语言设置
  const language = ref(localStorage.getItem('language') || 'zh-CN')
  
  // 主题设置
  const theme = ref(localStorage.getItem('theme') || 'light')
  
  // 是否显示页签栏
  const showTabs = ref(localStorage.getItem('showTabs') !== 'false')
  
  // 切换语言
  function setLanguage(lang) {
    language.value = lang
    localStorage.setItem('language', lang)
    // 这里可以触发语言包加载
  }
  
  // 切换主题
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', theme.value)
    applyTheme()
  }
  
  // 设置主题
  function setTheme(newTheme) {
    theme.value = newTheme
    localStorage.setItem('theme', newTheme)
    applyTheme()
  }
  
  // 切换页签显示
  function toggleTabs() {
    showTabs.value = !showTabs.value
    localStorage.setItem('showTabs', showTabs.value)
  }
  
  // 应用主题到DOM
  function applyTheme() {
    const html = document.documentElement
    if (theme.value === 'dark') {
      html.classList.add('dark')
    } else {
      html.classList.remove('dark')
    }
  }
  
  // 初始化时应用主题
  applyTheme()
  
  // 语言显示名称
  const languageName = computed(() => {
    const languages = {
      'zh-CN': '中文',
      'en-US': 'English'
    }
    return languages[language.value] || language.value
  })
  
  // 主题显示名称
  const themeName = computed(() => {
    return theme.value === 'light' ? '日间模式' : '夜间模式'
  })
  
  return {
    language,
    theme,
    showTabs,
    languageName,
    themeName,
    setLanguage,
    toggleTheme,
    setTheme,
    toggleTabs,
    applyTheme
  }
})
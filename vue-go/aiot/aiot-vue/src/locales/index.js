// 语言包配置
export const messages = {
  'zh-CN': {
    // 通用
    common: {
      save: '保存',
      cancel: '取消',
      confirm: '确认',
      delete: '删除',
      edit: '编辑',
      search: '搜索',
      reset: '重置',
      loading: '加载中...',
      noData: '暂无数据',
      operation: '操作'
    },
    
    // 导航菜单
    nav: {
      dashboard: '数据总览',
      sensors: '传感器',
      boards: '控制板',
      signboards: '指示牌',
      alerts: '设备告警',
      notifications: '通知日志',
      reports: '数据报表',
      users: '用户管理'
    },
    
    // 页签相关
    tabs: {
      closeCurrent: '关闭当前',
      closeOther: '关闭其他',
      closeAll: '关闭所有',
      refresh: '刷新'
    },
    
    // 设置
    settings: {
      language: '语言',
      theme: '主题',
      showTabs: '显示页签栏',
      logout: '退出登录',
      confirmLogout: '确定退出登录？'
    },
    
    // 用户
    user: {
      profile: '个人资料',
      settings: '设置'
    },

    // 楼层模型
    floor: {
      title: '楼层模型',
      floorBrowser: '楼层浏览',
      loadedNodes: (n) => `已加载 ${n} 节点`,
      loading: '加载中...',
      current: '当前',
      // 逃生工具栏
      antColony: '蚁群算法 (ACO)',
      particleSwarm: '粒子群算法 (PSO)',
      simulatedAnnealing: '模拟退火 (SA)',
      geneticAlgorithm: '遗传算法 (GA)',
      aco: '基础蚁群算法 (ACO)',
      iaco: '改进蚁群算法 (IACO)',
      greedy: '贪心算法 (Greedy)',
      compare: '三者对比',
      firePoints: '选择起火点',
      params: '参数配置',
      densityNode: '选择节点',
      setDensity: '设置密集度',
      safetyEdge: '选择通道段（可选）',
      setSafety: '覆盖安全系数（可选）',
      safety: '安全',
      density: '密集度',
      convergenceChart: '显示收敛曲线',
      fireMode: '火灾模式',
      elevatorsDisabled: '禁用电梯',
      fireModeTip: '火灾模式已开启：电梯停用，仅使用楼梯',
      selectStart: '选择起点',
      calculatePath: '计算逃生路径',
      calculatePathFire: '🔥 计算逃生路径',
      clearPath: '清除路径',
      computedIn: (ms, count) => `耗时 ${ms}ms · ${count} 条路径`,
      optimal: '最优',
      cost: '代价',
      estimatedTime: '≈',
      pleaseSelectStart: '请选择起点',
      calcFailed: '逃生路径计算失败',
      pathCalcFailed: '路径计算失败',
      // 模拟工具栏
      simulation: '逃生模拟',
      smokeOrigin: '起火点',
      start: '▶ 开始',
      pause: '⏸ 暂停',
      resume: '▶ 继续',
      reset: '↻ 重置',
      speed: '速度',
      pleaseCalcFirst: '请先计算逃生路径',
      // 相机面板
      viewPresets: '视角预设',
      perspective: '透视',
      top: '俯视',
      front: '正视',
      side: '侧视',
      fit: '适配',
      position: '位置 (X / Y / Z)',
      targetFocus: '目标焦点',
      camHint: '左键旋转 · 右键平移 · 滚轮缩放\nWASD / 方向键移动相机',
      // 2D
      noNodeData: '该楼层暂无节点数据',
      floorPlan: (f) => `${f}F 平面图`,
      legend: {
        room: '房间', corridor: '走廊', exit: '出口', stairs: '楼梯',
        elevator: '电梯', fireHydrant: '消防栓', monitorRoom: '监控室', electricalRoom: '配电间'
      },
      startLabel: '起点', exitLabel: '终点',
      placePerson: '📍 点击放置小人',
      confirmPlace: '✅ 确认放置',
      placedSuccess: (name) => `已放置小人到 ${name}`,
      placeFailed: '未找到附近的节点，请点击建筑内的位置',
      placeModeOff: '已退出放置模式',
      placeModeOn: '请点击3D模型上的节点放置小人'
    }
  },
  
  'en-US': {
    // Common
    common: {
      save: 'Save',
      cancel: 'Cancel',
      confirm: 'Confirm',
      delete: 'Delete',
      edit: 'Edit',
      search: 'Search',
      reset: 'Reset',
      loading: 'Loading...',
      noData: 'No data',
      operation: 'Operation'
    },
    
    // Navigation
    nav: {
      dashboard: 'Dashboard',
      sensors: 'Sensors',
      boards: 'Control Boards',
      signboards: 'Signboards',
      alerts: 'Device Alerts',
      notifications: 'Notification Logs',
      reports: 'Data Reports',
      users: 'User Management'
    },
    
    // Tabs
    tabs: {
      closeCurrent: 'Close Current',
      closeOther: 'Close Other',
      closeAll: 'Close All',
      refresh: 'Refresh'
    },
    
    // Settings
    settings: {
      language: 'Language',
      theme: 'Theme',
      showTabs: 'Show Tabs Bar',
      logout: 'Logout',
      confirmLogout: 'Are you sure to logout?'
    },
    
    // User
    user: {
      profile: 'Profile',
      settings: 'Settings'
    },

    // Floor Model
    floor: {
      title: 'Floor Model',
      floorBrowser: 'Floor Browser',
      loadedNodes: (n) => `Loaded ${n} nodes`,
      loading: 'Loading...',
      current: 'Current',
      antColony: 'Ant Colony (ACO)',
      particleSwarm: 'Particle Swarm (PSO)',
      simulatedAnnealing: 'Simulated Annealing (SA)',
      geneticAlgorithm: 'Genetic Algorithm (GA)',
      aco: 'Basic ACO',
      iaco: 'Improved ACO',
      greedy: 'Greedy',
      compare: 'Compare All',
      firePoints: 'Fire Points',
      params: 'Parameters',
      densityNode: 'Select Node',
      setDensity: 'Set Density',
      safetyEdge: 'Select Edge (Optional)',
      setSafety: 'Override Safety (Optional)',
      safety: 'Safety',
      density: 'Density',
      convergenceChart: 'Convergence Chart',
      fireMode: 'Fire Mode',
      elevatorsDisabled: 'Elevators Disabled',
      fireModeTip: 'Fire mode enabled: all elevators disabled, stairs only',
      selectStart: 'Select Start Point',
      calculatePath: 'Calculate Path',
      calculatePathFire: '🔥 Calculate Escape Path',
      clearPath: 'Clear Path',
      computedIn: (ms, count) => `Computed in ${ms}ms · ${count} paths`,
      optimal: 'Optimal',
      cost: 'Cost',
      estimatedTime: '≈',
      pleaseSelectStart: 'Please select a start point',
      calcFailed: 'Escape path calculation failed',
      pathCalcFailed: 'Path calculation failed',
      simulation: 'Simulation',
      smokeOrigin: 'Smoke Origin',
      start: '▶ Start',
      pause: '⏸ Pause',
      resume: '▶ Resume',
      reset: '↻ Reset',
      speed: 'Speed',
      pleaseCalcFirst: 'Please calculate escape path first',
      viewPresets: 'View Presets',
      perspective: 'Perspective',
      top: 'Top',
      front: 'Front',
      side: 'Side',
      fit: 'Fit',
      position: 'Position (X / Y / Z)',
      targetFocus: 'Target Focus',
      camHint: 'Left-click rotate · Right-click pan · Scroll zoom\nWASD / Arrow keys to move camera',
      noNodeData: 'No node data for this floor',
      floorPlan: (f) => `${f}F Floor Plan`,
      legend: {
        room: 'Room', corridor: 'Corridor', exit: 'Exit', stairs: 'Stairs',
        elevator: 'Elevator', fireHydrant: 'Fire Hydrant', monitorRoom: 'Monitor Room', electricalRoom: 'Electrical Room'
      },
      startLabel: 'Start', exitLabel: 'Exit',
      placePerson: '📍 Click to Place Person',
      confirmPlace: '✅ Confirm',
      placedSuccess: (name) => `Person placed at ${name}`,
      placeFailed: 'No nearby node found, click inside the building',
      placeModeOff: 'Exited placement mode',
      placeModeOn: 'Click on a node in the 3D model to place the person'
    }
  }
}

// 获取当前语言的翻译
export function useI18n() {
  const { language } = useSettingsStore?.() || { language: { value: 'zh-CN' } }
  
  return {
    t: (key) => {
      const keys = key.split('.')
      let result = messages[language.value]
      
      for (const k of keys) {
        if (result && result[k]) {
          result = result[k]
        } else {
          return key // 如果找不到翻译，返回原key
        }
      }
      
      return result
    }
  }
}

// 在组件中使用的组合式函数
export function useTranslate() {
  const { t } = useI18n()
  return { t }
}

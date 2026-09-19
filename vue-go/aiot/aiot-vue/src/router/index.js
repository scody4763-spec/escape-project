import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { public: true, title: '登录' }
  },
  {
    path: '/redirect',
    name: 'Redirect',
    component: () => import('@/views/Redirect.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('@/components/AppLayout.vue'),
    children: [
      { path: '',          redirect: '/dashboard' },
      { 
        path: 'dashboard',     
        name: 'Dashboard',     
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据总览' }
      },
      { 
        path: 'sensors',       
        name: 'Sensors',       
        component: () => import('@/views/Sensors.vue'),
        meta: { title: '指示灯' }
      },
      { 
        path: 'boards',        
        name: 'Boards',        
        component: () => import('@/views/Boards.vue'),
        meta: { title: '控制板' }
      },
      { 
        path: 'signboards',    
        name: 'Signboards',    
        component: () => import('@/views/Signboards.vue'),
        meta: { title: '显示板' }
      },
      { 
        path: 'alerts',        
        name: 'Alerts',        
        component: () => import('@/views/Alerts.vue'),
        meta: { title: '设备告警' }
      },
      // { 
      //   path: 'notifications', 
      //   name: 'Notifications', 
      //   component: () => import('@/views/Notifications.vue'),
      //   meta: { title: '通知日志' }
      // },
      {
        path: 'realtime',
        name: 'Realtime',
        component: () => import('@/views/Realtime.vue'),
        meta: { title: '指示灯实时数据' }
      },
      {
        path: 'ceiling-lights',
        name: 'CeilingLights',
        component: () => import('@/views/CeilingLights.vue'),
        meta: { title: '吸顶灯' }
      },
      {
        path: 'ceiling-light-realtime',
        name: 'CeilingLightRealtime',
        component: () => import('@/views/CeilingLightRealtime.vue'),
        meta: { title: '吸顶灯实时数据' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/Reports.vue'),
        meta: { title: '数据报表' }
      },
      {
        path: 'reports/sensor',
        name: 'SensorReports',
        component: () => import('@/views/Reports.vue'),
        meta: { title: '指示灯报表' }
      },
      {
        path: 'reports/ceiling-light',
        name: 'CeilingLightReports',
        component: () => import('@/views/Reports.vue'),
        meta: { title: '吸顶灯报表' }
      },
      {
        path: 'floor-model',
        name: 'FloorModel',
        component: () => import('@/views/FloorModel.vue'),
        meta: { title: '楼层模型' }
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/Users.vue'),
        meta: { title: '用户管理' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { title: '个人中心' }
      }
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.token) {
    return {
      path: '/login',
      query: to.fullPath && to.fullPath !== '/login' ? { redirect: to.fullPath } : undefined
    }
  }

  if (to.path === '/login' && auth.token) {
    return typeof to.query.redirect === 'string' ? to.query.redirect : '/'
  }
})

export default router

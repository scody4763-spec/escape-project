import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const request = axios.create({ baseURL: '/api', timeout: 15000 })
let redirectingToLogin = false

function handleAuthExpired(message = '登录已过期，请重新登录') {
  const auth = useAuthStore()
  auth.clearAuth()

  if (!redirectingToLogin) {
    redirectingToLogin = true
    const redirect = router.currentRoute.value.fullPath || '/'
    router.push({ path: '/login', query: { redirect } }).finally(() => {
      redirectingToLogin = false
    })
  }

  ElMessage.error(message)
}

request.interceptors.request.use(cfg => {
  const { token } = useAuthStore()
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

request.interceptors.response.use(
  res => {
    const body = res.data
    const code = body?.code
    const message = body?.message || '请求失败'
    const unauthorizedCodes = [401, 10001, 10002]

    if (body && code !== undefined && code !== 0) {
      if (unauthorizedCodes.includes(code) || /token|登录|认证|expired|unauthorized/i.test(message)) {
        handleAuthExpired(message)
      } else {
        ElMessage.error(message)
      }
      return Promise.reject(body)
    }

    return body?.data !== undefined ? body.data : body
  },
  err => {
    if (err.response?.status === 401) {
      handleAuthExpired()
    } else {
      const msg = err.response?.data?.message || err.message || '请求失败'
      ElMessage.error(msg)
    }
    return Promise.reject(err)
  }
)

export default request

import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const token    = ref(localStorage.getItem('token') || '')
  const adminId  = ref(localStorage.getItem('adminId') || '')
  const identity = ref(Number(localStorage.getItem('identity')) || 1)

  function setAuth(data) {
    token.value    = data.token
    adminId.value  = data.adminId
    identity.value = data.identity
    localStorage.setItem('token',    data.token)
    localStorage.setItem('adminId',  data.adminId)
    localStorage.setItem('identity', data.identity)
  }

  function clearAuth() {
    token.value = adminId.value = ''
    identity.value = 1
    localStorage.removeItem('token')
    localStorage.removeItem('adminId')
    localStorage.removeItem('identity')
  }

  return { token, adminId, identity, setAuth, clearAuth }
})

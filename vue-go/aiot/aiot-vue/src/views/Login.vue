<template>
  <div class="login-wrap" :class="{ dark: isDark }">
    <div class="grid-bg" />
    <div class="blob blob1" />
    <div class="blob blob2" />

    <div class="login-shell">
      <section class="hero-panel">
        <div class="hero-badge">SMART · SECURE · REALTIME</div>
        <h1 class="hero-title">AIoT 智能物联网管理平台</h1>
        <p class="hero-desc">
          面向传感器、控制板、显示板和告警通知的一体化运维平台，支持实时监测、报表分析与多主题切换。
        </p>
        <div class="hero-points">
          <div class="point"><span class="point-dot" /> WebSocket 实时数据流</div>
          <div class="point"><span class="point-dot" /> 报表统计与趋势分析</div>
          <div class="point"><span class="point-dot" /> 夜间 / 日间主题无缝切换</div>
        </div>
      </section>

      <section class="card">
        <div class="card-top">
          <div class="brand">
            <div class="brand-icon">
              <el-icon><Connection /></el-icon>
            </div>
            <div>
              <h2 class="brand-title">欢迎登录</h2>
              <p class="brand-sub">请输入账号密码进入系统</p>
            </div>
          </div>
          <el-tooltip :content="settings.themeName">
            <el-button circle @click="settings.toggleTheme()">
              <el-icon v-if="isDark"><Sunny /></el-icon>
              <el-icon v-else><Moon /></el-icon>
            </el-button>
          </el-tooltip>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" class="login-form" @keyup.enter="submit">
          <el-form-item prop="userAccount">
            <el-input v-model="form.userAccount" placeholder="用户账号" size="large" clearable>
              <template #prefix><el-icon><User /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-form-item prop="password">
            <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password>
              <template #prefix><el-icon><Lock /></el-icon></template>
            </el-input>
          </el-form-item>

          <el-button type="primary" size="large" class="login-btn" :loading="loading" @click="submit">登 录</el-button>
        </el-form>

        <div class="login-footer">
          <span>推荐使用现代浏览器访问</span>
          <span>© {{ year }} AIoT Platform</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { login } from '@/api/auth'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const settings = useSettingsStore()
const formRef = ref()
const loading = ref(false)
const year = new Date().getFullYear()

const isDark = computed(() => settings.theme === 'dark')
const redirectPath = computed(() => typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard')
const form = ref({ userAccount: '', password: '' })
const rules = {
  userAccount: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

async function submit() {
  await formRef.value.validate()
  loading.value = true
  try {
    const res = await login(form.value)
    auth.setAuth(res)
    ElMessage.success('登录成功')
    router.push(redirectPath.value)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.12), transparent 30%),
    radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.15), transparent 32%),
    linear-gradient(135deg, #f4f7fb 0%, #e9eef8 100%);
}

.login-wrap.dark {
  background:
    radial-gradient(circle at top left, rgba(99, 102, 241, 0.14), transparent 30%),
    radial-gradient(circle at bottom right, rgba(139, 92, 246, 0.16), transparent 32%),
    linear-gradient(135deg, #08101d 0%, #10192c 100%);
}

.grid-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px);
  background-size: 46px 46px;
}

.blob { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
.blob1 { width: 360px; height: 360px; background: rgba(99, 102, 241, 0.15); top: -80px; left: -60px; }
.blob2 { width: 320px; height: 320px; background: rgba(139, 92, 246, 0.12); bottom: -80px; right: -60px; }

.login-shell {
  position: relative;
  z-index: 1;
  width: min(1120px, 100%);
  display: grid;
  grid-template-columns: 1.1fr 440px;
  gap: 24px;
  align-items: stretch;
}

.hero-panel,
.card {
  backdrop-filter: blur(18px);
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  box-shadow: 0 20px 60px rgba(15, 23, 42, 0.12);
}

.hero-panel {
  padding: 48px;
  background: rgba(255, 255, 255, 0.65);
  color: #0f172a;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-wrap.dark .hero-panel,
.login-wrap.dark .card {
  background: rgba(13, 21, 38, 0.72);
  border-color: #1e3456;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.hero-badge { font-size: 12px; letter-spacing: 2px; color: #6366f1; margin-bottom: 18px; font-weight: 700; }
.hero-title { font-size: 38px; line-height: 1.2; margin-bottom: 16px; color: inherit; }
.hero-desc { font-size: 15px; line-height: 1.8; color: #475569; margin-bottom: 28px; }
.login-wrap.dark .hero-panel { color: #e2e8f0; }
.login-wrap.dark .hero-desc { color: #94a3b8; }

.hero-points { display: flex; flex-direction: column; gap: 14px; }
.point { display: flex; align-items: center; gap: 10px; font-size: 14px; }
.point-dot { width: 10px; height: 10px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); box-shadow: 0 0 14px rgba(99, 102, 241, 0.45); }

.card {
  padding: 32px;
  background: rgba(255, 255, 255, 0.82);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-top,
.brand { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.brand { justify-content: flex-start; }
.brand-icon {
  width: 56px; height: 56px; border-radius: 18px; display: inline-flex; align-items: center; justify-content: center;
  background: rgba(99, 102, 241, 0.12); color: #6366f1; border: 1px solid rgba(99, 102, 241, 0.18); font-size: 26px;
}
.brand-title { font-size: 24px; color: var(--el-text-color-primary); margin-bottom: 4px; }
.brand-sub { font-size: 12px; color: var(--el-text-color-secondary); }
.login-form { margin-top: 28px; }
.login-form :deep(.el-form-item) { margin-bottom: 22px; }
.login-form :deep(.el-input__wrapper) { min-height: 46px; border-radius: 14px; }
.login-btn {
  width: 100%; height: 46px; border: none; border-radius: 14px; letter-spacing: 6px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}
.login-footer {
  margin-top: 28px; padding-top: 18px; border-top: 1px solid rgba(148, 163, 184, 0.18);
  display: flex; justify-content: space-between; gap: 16px; font-size: 12px; color: var(--el-text-color-secondary);
}

@media (max-width: 960px) {
  .login-shell { grid-template-columns: 1fr; }
  .hero-panel { display: none; }
}

@media (max-width: 520px) {
  .login-wrap { padding: 14px; }
  .card { padding: 24px 18px; border-radius: 18px; }
  .login-footer { flex-direction: column; }
}
</style>

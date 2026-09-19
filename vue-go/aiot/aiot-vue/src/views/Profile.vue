<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <span>个人中心</span>
        </div>
      </template>
      
      <div class="profile-content">
        <div class="avatar-section">
          <el-avatar :size="100" :src="user.avatar">
            <el-icon><UserFilled /></el-icon>
          </el-avatar>
          <div class="avatar-info">
            <h3>{{ user.name }}</h3>
            <p>{{ user.role }}</p>
          </div>
        </div>
        
        <el-divider />
        
        <div class="info-section">
          <h4>基本信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
            <el-descriptions-item label="邮箱">{{ user.email }}</el-descriptions-item>
            <el-descriptions-item label="手机号">{{ user.phone }}</el-descriptions-item>
            <el-descriptions-item label="部门">{{ user.department }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ user.createTime }}</el-descriptions-item>
            <el-descriptions-item label="最后登录">{{ user.lastLogin }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <el-divider />
        
        <div class="settings-section">
          <h4>偏好设置</h4>
          <div class="settings-list">
            <div class="setting-item">
              <span>语言设置</span>
              <el-select v-model="language" size="small" style="width: 120px">
                <el-option label="中文" value="zh-CN" />
                <el-option label="English" value="en-US" />
              </el-select>
            </div>
            <div class="setting-item">
              <span>主题模式</span>
              <el-switch
                v-model="theme"
                active-text="夜间"
                inactive-text="日间"
                :active-value="'dark'"
                :inactive-value="'light'"
              />
            </div>
            <div class="setting-item">
              <span>显示页签栏</span>
              <el-switch v-model="showTabs" />
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="card-footer">
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
          <el-button @click="resetSettings">重置</el-button>
        </div>
      </template>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { ElMessage } from 'element-plus'

const settingsStore = useSettingsStore()

// 用户信息
const user = ref({
  name: '管理员',
  username: 'admin',
  role: '系统管理员',
  email: 'admin@example.com',
  phone: '13800138000',
  department: '技术部',
  createTime: '2024-01-01 10:00:00',
  lastLogin: '2024-03-17 15:30:00',
  avatar: ''
})

// 设置
const language = computed({
  get: () => settingsStore.language,
  set: (value) => settingsStore.setLanguage(value)
})

const theme = computed({
  get: () => settingsStore.theme,
  set: (value) => settingsStore.setTheme(value)
})

const showTabs = computed({
  get: () => settingsStore.showTabs,
  set: (value) => {
    if (value !== settingsStore.showTabs) {
      settingsStore.toggleTabs()
    }
  }
})

const saveSettings = () => {
  ElMessage.success('设置已保存')
}

const resetSettings = () => {
  settingsStore.setLanguage('zh-CN')
  settingsStore.setTheme('light')
  if (!settingsStore.showTabs) {
    settingsStore.toggleTabs()
  }
  ElMessage.info('设置已重置')
}
</script>

<style scoped>
.profile-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.profile-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-content {
  padding: 20px 0;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
}

.avatar-info h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

.avatar-info p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.info-section h4,
.settings-section h4 {
  margin: 0 0 16px 0;
  color: var(--el-text-color-primary);
  font-size: 16px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.setting-item span {
  color: var(--el-text-color-regular);
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
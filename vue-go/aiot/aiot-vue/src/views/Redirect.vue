<template>
  <div class="redirect-container">
    <el-result icon="success" title="正在跳转..." sub-title="请稍候">
      <template #extra>
        <el-button type="primary" @click="handleBack">返回</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

onMounted(() => {
  const redirect = route.query.redirect || '/dashboard'
  setTimeout(() => {
    router.replace(redirect)
  }, 100)
})

const handleBack = () => {
  router.back()
}
</script>

<style scoped>
.redirect-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>
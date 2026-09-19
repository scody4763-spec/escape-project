<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-text">通知日志</div>
      <span style="font-size:12px;color:var(--el-text-color-secondary)">共 {{ total }} 条记录</span>
    </div>

    <div class="panel">
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="id"      label="ID"   width="80" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.type || row.notifyType || '通知' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="内容" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.content || row.message || row.body || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="接收方" width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="mono" style="font-size:12px">{{ row.receiver || row.target || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'" effect="plain">
              {{ row.status === 1 ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="180">
          <template #default="{ row }">
            <span class="mono" style="font-size:12px">{{ row.createdAt || row.createTime || '—' }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @change="load"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listNotifications } from '@/api/notification'

const list     = ref([])
const loading  = ref(false)
const page     = ref(1)
const pageSize = ref(20)
const total    = ref(0)

async function load() {
  loading.value = true
  try {
    const res = await listNotifications({ page: page.value, pageSize: pageSize.value })
    list.value  = res?.list  || []
    total.value = res?.total ||  0
  } finally { loading.value = false }
}

onMounted(load)
</script>

<style scoped>
.pagination { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>

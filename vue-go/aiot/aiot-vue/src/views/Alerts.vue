<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-text">设备告警</div>
      <div class="header-stats">
        <span class="badge warn">未处理 {{ counts[0] }}</span>
        <span class="badge proc">已处理 {{ counts[1] }}</span>
        <span class="badge done">已忽略 {{ counts[2] }}</span>
      </div>
    </div>

    <!-- Filter -->
    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" size="small" @change="load">
        <el-radio-button :label="-1">全部</el-radio-button>
        <el-radio-button :label="0">未处理</el-radio-button>
        <el-radio-button :label="1">已处理</el-radio-button>
        <el-radio-button :label="2">已忽略</el-radio-button>
      </el-radio-group>
      <el-select v-model="typeFilter" placeholder="告警类型" clearable size="small" style="width:140px" @change="load">
        <el-option label="设备离线" :value="1" />
        <el-option label="火焰告警" :value="2" />
        <el-option label="电流异常" :value="3" />
        <el-option label="其他" :value="4" />
      </el-select>
    </div>

    <div class="panel">
      <el-table :data="pagedList" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="设备 MAC" min-width="150">
          <template #default="{ row }">
            <span class="mono" style="color:#6366f1">{{ row.macAddress }}</span>
          </template>
        </el-table-column>
        <el-table-column label="告警类型" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="typeTagType(row.alertType)" effect="plain">
              {{ alertTypeLabel(row.alertType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="告警信息" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span style="color:var(--el-text-color-regular)">{{ row.alertDesc || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <div class="status-cell">
              <span class="dot" :class="statusDot(row.status)" />
              {{ statusLabel(row.status) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="mono" style="font-size:12px">{{ row.createdAt || row.createTime || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 0"
              size="small" link type="warning"
              @click="setStatus(row, 1)"
            >标记已处理</el-button>
            <el-button
              v-if="row.status === 0"
              size="small" link type="info"
              @click="setStatus(row, 2)"
            >忽略</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="list.length"
          layout="total, sizes, prev, pager, next"
          small
          background
        />
      </div>
    </div>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="告警详情" width="560px" align-center>
      <template v-if="detailRow">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="告警 ID">{{ detailRow.id }}</el-descriptions-item>
          <el-descriptions-item label="设备类型">{{ deviceTypeLabel(detailRow.deviceType) }}</el-descriptions-item>
          <el-descriptions-item label="设备 MAC">
            <span class="mono" style="color:#6366f1">{{ detailRow.macAddress || '—' }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="告警类型">
            <el-tag size="small" :type="typeTagType(detailRow.alertType)" effect="plain">
              {{ alertTypeLabel(detailRow.alertType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理状态">
            <el-tag size="small" :type="statusTagType(detailRow.status)">
              {{ statusLabel(detailRow.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发生时间">{{ detailRow.createdAt || detailRow.createTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="处理时间">{{ detailRow.resolvedAt || '—' }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ detailRow.updatedAt || detailRow.updateTime || '—' }}</el-descriptions-item>
          <el-descriptions-item label="告警描述" :span="2">{{ detailRow.alertDesc || '—' }}</el-descriptions-item>
        </el-descriptions>

        <div v-if="detailRow.status === 0" class="detail-actions">
          <el-button type="warning" @click="setStatusAndClose(detailRow, 1)">标记已处理</el-button>
          <el-button type="info" @click="setStatusAndClose(detailRow, 2)">忽略</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listAlerts, updateAlert } from '@/api/alert'
import { ElMessage } from 'element-plus'

const list         = ref([])
const loading      = ref(false)
const statusFilter = ref(-1)
const typeFilter   = ref(null)
const detailVisible = ref(false)
const detailRow     = ref(null)
const currentPage   = ref(1)
const pageSize      = ref(10)
const pagedList     = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return list.value.slice(start, start + pageSize.value)
})

const counts = computed(() => [0,1,2].map(s => list.value.filter(a => a.status === s).length))

const statusLabel    = (s) => ['未处理','已处理','已忽略'][s] ?? '—'
const statusDot      = (s) => ['dot-warning','dot-online','dot-muted'][s] ?? 'dot-offline'
const statusTagType  = (s) => ['warning','success','info'][s] ?? ''
const alertTypeLabel = (t) => ({ 1:'设备离线', 2:'火焰告警', 3:'电流异常', 4:'其他' })[t] || `类型${t}`
const typeTagType    = (t) => ({ 1:'info', 2:'danger', 3:'warning', 4:'primary' })[t] || ''
const deviceTypeLabel = (t) => ({ 1:'传感器', 2:'显示板' })[t] || `类型${t}`

function openDetail(row) {
  detailRow.value = row
  detailVisible.value = true
}

async function load() {
  loading.value = true
  try {
    const params = { status: statusFilter.value }
    if (typeFilter.value) params.alertType = typeFilter.value
    const res = await listAlerts(params)
    
    list.value = res?.list  || []
  } finally { loading.value = false }
}

async function setStatus(row, status) {
  await updateAlert(row.id, { status })
  ElMessage.success('状态已更新')
  await load()
}

async function setStatusAndClose(row, status) {
  await setStatus(row, status)
  detailVisible.value = false
}

onMounted(load)
</script>

<style scoped>
.header-stats { display: flex; gap: 10px; }
.badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 500; }
.badge.warn { background: #f59e0b18; color: #f59e0b; border: 1px solid #f59e0b44; }
.badge.proc { background: #22c55e18; color: #22c55e; border: 1px solid #22c55e44; }
.badge.done { background: #64748b18; color: #64748b; border: 1px solid #64748b44; }
.filter-bar  { display: flex; gap: 12px; align-items: center; }
.status-cell { display: flex; align-items: center; font-size: 13px; }
.dot-muted   { background: #64748b; }
.detail-actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--el-border-color); }
.pagination-wrap { display: flex; justify-content: flex-end; padding: 12px 0 4px; }
</style>

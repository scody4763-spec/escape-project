<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title-text">指示灯管理</div>
        <div style="font-size:12px;color:var(--el-text-color-secondary);margin-top:3px">
          共 {{ list.length }} 个指示灯 · {{ onlineCount }} 在线 · {{ list.length - onlineCount }} 离线
        </div>
      </div>
      <el-button type="primary" :icon="Plus" @click="openAdd">添加传感器</el-button>
    </div>

    <!-- Status filter -->
    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" size="small">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="online">在线</el-radio-button>
        <el-radio-button label="offline">离线</el-radio-button>
      </el-radio-group>
      <el-input v-model="search" placeholder="搜索 MAC / 地址" style="width:220px" size="small" clearable>
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <!-- Table -->
    <div class="panel">
      <el-table :data="pagedList" v-loading="loading" row-class-name="table-row" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="MAC 地址" min-width="80">
          <template #default="{ row }">
            <span class="mono" >{{ row.macAddress }}</span>
          </template>
        </el-table-column>
        <el-table-column label="在线状态" width="100">
          <template #default="{ row }">
            <div class="status-cell">
              <span class="dot" :class="isOnline(row.macAddress) ? 'dot-online' : 'dot-offline'" />
              {{ isOnline(row.macAddress) ? '在线' : '离线' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="控制板" width="100">
          <template #default="{ row }">
            <span v-if="row.boardId">{{ boardName(row.boardId) }}</span>
            <span v-else style="color:var(--el-text-color-secondary)">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="位置地址" min-width="140" show-overflow-tooltip />
        <el-table-column label="设备状态" width="90">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 1 ? 'success' : 'info'" effect="plain">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrap">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="filtered.length"
          layout="total, sizes, prev, pager, next"
          small
          background
        />
      </div>
    </div>

    <!-- Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑指示灯' : '添加指示灯'" width="500px" align-center>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="MAC 地址" prop="macAddress">
          <el-input v-model="form.macAddress" placeholder="如：AA:BB:CC:DD:EE:FF" class="mono" />
        </el-form-item>
        <el-form-item label="控制板">
          <el-select v-model="form.boardId" placeholder="选择控制板" clearable style="width:100%">
            <el-option v-for="b in boards" :key="b.id" :label="b.name" :value="b.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="位置地址">
          <el-input v-model="form.address" placeholder="安装位置描述" />
        </el-form-item>
        <el-form-item label="图片 URL">
          <el-input v-model="form.img" placeholder="设备图片链接（暂不做上传功能）" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { listSensors, getSensorStatus, createSensor, updateSensor, deleteSensor } from '@/api/sensor'
import { listBoards } from '@/api/board'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const list        = ref([])
const sensorSt    = ref({})
const boards      = ref([])
const loading     = ref(false)
const saving      = ref(false)
const dialogVisible = ref(false)
const isEdit      = ref(false)
const formRef     = ref()
const statusFilter = ref('all')
const search      = ref('')
const currentPage = ref(1)
const pageSize    = ref(10)

const form = ref({ macAddress: '', boardId: null, address: '', img: '', status: 1 })
const rules = { macAddress: [{ required: true, message: '请输入 MAC 地址' }] }

const isOnline = (mac) => sensorSt.value[mac] === 'online'
const onlineCount = computed(() => list.value.filter(s => isOnline(s.macAddress)).length)
const boardName = (id) => boards.value.find(b => b.id === id)?.name || `#${id}`

const filtered = computed(() => list.value.filter(s => {
  if (statusFilter.value === 'online'  && !isOnline(s.macAddress)) return false
  if (statusFilter.value === 'offline' &&  isOnline(s.macAddress)) return false
  if (search.value) {
    const q = search.value.toLowerCase()
    return s.macAddress?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q)
  }
  return true
}))
const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

async function load() {
  loading.value = true
  try {
    const [sRes, stRes, bRes] = await Promise.all([listSensors(), getSensorStatus(), listBoards()])
    list.value     = sRes?.list   ?? sRes   ?? []
    sensorSt.value = stRes?.status ?? stRes  ?? {}
    boards.value   = bRes?.list   ?? bRes   ?? []
  } finally { loading.value = false }
}

function openAdd() {
  isEdit.value = false
  form.value   = { macAddress: '', boardId: null, address: '', img: '', status: 1 }
  dialogVisible.value = true
}
function openEdit(row) {
  isEdit.value = true
  form.value   = { ...row }
  dialogVisible.value = true
}

async function handleSave() {
  await formRef.value.validate()
  saving.value = true
  try {
    if (isEdit.value) {
      await updateSensor(form.value.id, form.value)
    } else {
      await createSensor(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await load()
  } finally { saving.value = false }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除传感器 ${row.macAddress}？`, '删除确认', { type: 'warning' })
  await deleteSensor(row.id)
  ElMessage.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; align-items: center; }
.status-cell { display: flex; align-items: center; font-size: 13px; }
:deep(.table-row) { background: transparent !important; }
.pagination-wrap { display: flex; justify-content: flex-end; padding: 12px 0 4px; }
</style>

<template>
  <div class="page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <div class="page-title-text">吸顶灯管理</div>
        <div style="font-size:12px;color:var(--el-text-color-secondary);margin-top:3px">
          共 {{ list.length }} 台吸顶灯 · {{ onlineCount }} 在线 · {{ list.length - onlineCount }} 离线
        </div>
      </div>
      <el-button type="primary" :icon="Plus" @click="openAdd">添加吸顶灯</el-button>
    </div>

    <!-- Status filter -->
    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" size="small">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="online">在线</el-radio-button>
        <el-radio-button label="offline">离线</el-radio-button>
      </el-radio-group>
      <el-input v-model="search" placeholder="搜索设备ID / 地址" style="width:220px" size="small" clearable>
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <!-- Table -->
    <div class="panel">
      <el-table :data="pagedList" v-loading="loading" row-class-name="table-row" stripe>
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="设备 ID" min-width="100">
          <template #default="{ row }">
            <span class="mono">{{ row.deviceId }}</span>
          </template>
        </el-table-column>
        <el-table-column label="MAC 地址" min-width="100">
          <template #default="{ row }">
            <span class="mono">{{ row.macAddress || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="在线状态" width="100">
          <template #default="{ row }">
            <div class="status-cell">
              <span class="dot" :class="isOnline(row.deviceId) ? 'dot-online' : 'dot-offline'" />
              {{ isOnline(row.deviceId) ? '在线' : '离线' }}
            </div>
          </template>
        </el-table-column>
        <el-table-column label="楼层" width="70" align="center">
          <template #default="{ row }">
            {{ row.floorId || '—' }}F
          </template>
        </el-table-column>
        <el-table-column prop="zone" label="区域" width="70" align="center" />
        <el-table-column prop="address" label="位置地址" min-width="140" show-overflow-tooltip />
        <el-table-column label="状态" width="80">
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
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑吸顶灯' : '添加吸顶灯'" width="500px" align-center>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="设备 ID" prop="deviceId">
          <el-input v-model="form.deviceId" placeholder="如：ceiling_001" class="mono" />
        </el-form-item>
        <el-form-item label="MAC 地址">
          <el-input v-model="form.macAddress" placeholder="如：AA:BB:CC:DD:EE:FF" class="mono" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="楼层">
              <el-input-number v-model="form.floorId" :min="1" :max="99" style="width:100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="区域">
              <el-input v-model="form.zone" placeholder="如：A" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="位置地址">
          <el-input v-model="form.address" placeholder="安装位置描述" />
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
import { listCeilingLights, getCeilingLightStatus, createCeilingLight, updateCeilingLight, deleteCeilingLight } from '@/api/ceilingLight'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const list          = ref([])
const deviceSt      = ref({})
const loading       = ref(false)
const saving        = ref(false)
const dialogVisible = ref(false)
const isEdit        = ref(false)
const formRef       = ref()
const statusFilter  = ref('all')
const search        = ref('')
const currentPage   = ref(1)
const pageSize      = ref(10)

const form  = ref(getDefaultForm())
const rules = { deviceId: [{ required: true, message: '请输入设备 ID' }] }

function getDefaultForm() {
  return { deviceId: '', macAddress: '', address: '', floorId: 1, zone: '', status: 1 }
}

const isOnline     = (id) => deviceSt.value[id] === 'online' || deviceSt.value[id] === 1
const onlineCount  = computed(() => list.value.filter(s => isOnline(s.deviceId)).length)

const filtered = computed(() => list.value.filter(s => {
  if (statusFilter.value === 'online'  && !isOnline(s.deviceId)) return false
  if (statusFilter.value === 'offline' &&  isOnline(s.deviceId)) return false
  if (search.value) {
    const q = search.value.toLowerCase()
    return s.deviceId?.toLowerCase().includes(q) || s.address?.toLowerCase().includes(q) || s.macAddress?.toLowerCase().includes(q)
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
    const [lRes, stRes] = await Promise.all([listCeilingLights(), getCeilingLightStatus()])
    list.value     = lRes?.list   ?? lRes   ?? []
    deviceSt.value = stRes?.status ?? stRes  ?? {}
  } finally { loading.value = false }
}

function openAdd() {
  isEdit.value = false
  form.value   = getDefaultForm()
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
      await updateCeilingLight(form.value.id, form.value)
    } else {
      await createCeilingLight(form.value)
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await load()
  } finally { saving.value = false }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确定删除吸顶灯 ${row.deviceId}？`, '删除确认', { type: 'warning' })
  await deleteCeilingLight(row.id)
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

<template>
  <div class="page">
    <div class="page-header">
      <div class="page-title-text">显示板管理</div>
      <el-button type="primary" :icon="Plus" @click="openAdd">添加显示板</el-button>
    </div>

    <div class="panel">
      <el-table :data="pagedList" v-loading="loading" stripe>
        <el-table-column prop="id" label="ID" width="50" />
        <el-table-column label="MAC 地址" min-width="80">
          <template #default="{ row }">
            <span class="mono">{{ row.macAddress }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="位置" min-width="120" show-overflow-tooltip />
        <el-table-column label="LED 亮度" width="90" align="center">
          <template #default="{ row }">
            <div class="led-cell">
              <div class="led-indicator" :class="{ active: row.led > 0 }" />
              <span class="led-val">{{ row.led }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="蜂鸣器" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.buzzer === 2 ? 'warning' : 'info'" effect="plain">
              {{ row.buzzer === 2 ? '开' : '关' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="火焰传感" width="100" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.flame === 1 ? 'warning' : 'info'" effect="plain">
              {{ row.flame === 1 ? '开' : '关' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="供电" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.electricitySwitch === 1 ? 'success' : 'info'" effect="plain">
              {{ row.electricitySwitch === 1 ? 'ON' : 'OFF' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="RGB 颜色" width="110" align="center">
          <template #default="{ row }">
            <div class="rgb-dots">
              <div class="rgb-dot" :style="{ background: rgbToHex(row.rgbLeft) || '#1e3456' }" title="左" />
              <div class="rgb-dot" :style="{ background: rgbToHex(row.rgbMid) || '#1e3456' }" title="中" />
              <div class="rgb-dot" :style="{ background: rgbToHex(row.rgbRight) || '#1e3456' }" title="右" />
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openEdit(row)">控制</el-button>
            <el-button size="small" link type="danger" @click="handleDelete(row)">删除</el-button>
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

    <!-- 编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑显示板' : '添加显示板'" width="600px" align-center>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="MAC 地址" prop="macAddress">
              <el-input v-model="form.macAddress" class="mono" placeholder="AA:BB:CC:DD:EE:FF" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="位置地址">
              <el-input v-model="form.address" placeholder="安装位置" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          <span style="font-size:12px;color:var(--el-text-color-secondary)">显示区域</span>
        </el-divider>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="左区显示">
              <el-select v-model="form.displayLeft" style="width:100%" placeholder="请选择显示模式">
                <el-option
                    v-for="item in displayOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="中区显示">
              <el-select v-model="form.displayMid" style="width:100%" placeholder="请选择显示模式">
                <el-option
                    v-for="item in displayOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="右区显示">
              <el-select v-model="form.displayRight" style="width:100%" placeholder="请选择显示模式">
                <el-option
                    v-for="item in displayOptions"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          <span style="font-size:12px;color:var(--el-text-color-secondary)">RGB 颜色</span>
        </el-divider>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="左区 RGB">
              <el-color-picker v-model="form.rgbLeft" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="中区 RGB">
              <el-color-picker v-model="form.rgbMid" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="右区 RGB">
              <el-color-picker v-model="form.rgbRight" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">
          <span style="font-size:12px;color:var(--el-text-color-secondary)">设备控制</span>
        </el-divider>
        <div class="control-row">
          <div class="control-item">
            <span class="control-label"><el-icon style="color:#22c55e"><Sunny /></el-icon> LED 灯</span>
            <el-switch v-model="form.led" :active-value="1" :inactive-value="0" />
          </div>
          <div class="control-item">
            <span class="control-label"><el-icon style="color:#f59e0b"><Bell /></el-icon> 蜂鸣器</span>
            <el-switch v-model="form.buzzer" :active-value="1" :inactive-value="0" />
          </div>
          <div class="control-item">
            <span class="control-label"><el-icon style="color:#ef4444"><WarningFilled /></el-icon> 火焰传感</span>
            <el-switch v-model="form.flame" :active-value="1" :inactive-value="0" />
          </div>
          <div class="control-item">
            <span class="control-label"><el-icon style="color:#6366f1"><Lightning /></el-icon> 供电开关</span>
            <el-switch v-model="form.electricitySwitch" :active-value="1" :inactive-value="0" />
          </div>
        </div>

        <el-form-item label="备注" style="margin-top:12px">
          <el-input v-model="form.remark" type="textarea" :rows="2" />
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
import { listSignboards, createSignboard, updateSignboard, deleteSignboard } from '@/api/signboard'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const list = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const pagedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return list.value.slice(start, start + pageSize.value)
})
const saving = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const formRef = ref()
const form = ref(getDefaultForm())
const rules = { macAddress: [{ required: true, message: '请输入 MAC 地址' }] }

// 默认表单数据
function getDefaultForm() {
  return {
    macAddress: '',
    address: '',
    remark: '',
    displayLeft: 10,
    displayMid: 10,
    displayRight: 10,
    rgbLeft: '#ffffff',
    rgbMid: '#ffffff',
    rgbRight: '#ffffff',
    led: 0,
    buzzer: 0,
    flame: 0,
    electricitySwitch: 0
  }
}

// 下拉选项配置
const displayOptions = [
  { value: 1, label: 'Left' },
  { value: 2, label: 'Right' },
  { value: 3, label: 'Down' },
  { value: 4, label: 'Up' },
  { value: 5, label: 'left' },
  { value: 6, label: 'right' },
  { value: 7, label: 'down' },
  { value: 8, label: 'up' },
  { value: 9, label: 'style' },
  { value: 10, label: 'motifs' },
  // 你可以根据需要添加更多
]
// RGB数组字符串转十六进制颜色
function rgbToHex(value) {
  if (!value) return '#ffffff'
  if (typeof value !== 'string') return '#ffffff'

  const raw = value.trim()
  if (!raw) return '#ffffff'

  if (raw.startsWith('#')) {
    if (raw.length === 4 || raw.length === 7) return raw
    if (raw.length === 9) return raw.slice(0, 7)
  }

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length >= 3) {
      const [r, g, b] = parsed
      const toHex = n => Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16).padStart(2, '0')
      return `#${toHex(r)}${toHex(g)}${toHex(b)}`
    }
  } catch {
    // ignore
  }

  const match = raw.match(/rgba?\(([^)]+)\)/i)
  if (match) {
    const parts = match[1].split(',').map(item => Number.parseFloat(item.trim()))
    if (parts.length >= 3) {
      const toHex = n => Math.max(0, Math.min(255, Math.round(Number(n) || 0))).toString(16).padStart(2, '0')
      return `#${toHex(parts[0])}${toHex(parts[1])}${toHex(parts[2])}`
    }
  }

  return '#ffffff'
}

// 十六进制颜色转RGB数组字符串
function hexToRgbStr(color) {
  if (!color || typeof color !== 'string') return '[255,255,255]'

  const raw = color.trim()
  if (!raw) return '[255,255,255]'

  if (raw.startsWith('rgb')) {
    const match = raw.match(/rgba?\(([^)]+)\)/i)
    if (!match) return '[255,255,255]'
    const parts = match[1].split(',').map(item => Math.max(0, Math.min(255, Math.round(Number.parseFloat(item.trim()) || 0))))
    return JSON.stringify(parts.slice(0, 3))
  }

  if (!raw.startsWith('#')) return '[255,255,255]'

  let hexStr = raw.slice(1)
  if (hexStr.length === 3) {
    hexStr = hexStr.split('').map(c => c + c).join('')
  }
  if (hexStr.length === 8) {
    hexStr = hexStr.slice(0, 6)
  }
  if (hexStr.length !== 6) return '[255,255,255]'

  const r = Number.parseInt(hexStr.substring(0, 2), 16)
  const g = Number.parseInt(hexStr.substring(2, 4), 16)
  const b = Number.parseInt(hexStr.substring(4, 6), 16)

  return JSON.stringify([r, g, b])
}

// 加载数据
async function load() {
  loading.value = true
  try {
    const res = await listSignboards()
    list.value = res?.list || []
  } finally {
    loading.value = false
  }
}

// 打开添加对话框
function openAdd() {
  isEdit.value = false
  form.value = getDefaultForm()
  dialogVisible.value = true
}

// 打开编辑对话框
function openEdit(row) {
  isEdit.value = true
  const rowData = { ...row }
  
  // 转换RGB数据
  if (rowData.rgbLeft) rowData.rgbLeft = rgbToHex(rowData.rgbLeft)
  if (rowData.rgbMid) rowData.rgbMid = rgbToHex(rowData.rgbMid)
  if (rowData.rgbRight) rowData.rgbRight = rgbToHex(rowData.rgbRight)
  
  form.value = rowData
  dialogVisible.value = true
}

// 保存数据
async function handleSave() {
  try {
    await formRef.value.validate()
    saving.value = true
    
    const saveData = { ...form.value }
    
    // 转换RGB数据
    saveData.rgbLeft = hexToRgbStr(saveData.rgbLeft)
    saveData.rgbMid = hexToRgbStr(saveData.rgbMid)
    saveData.rgbRight = hexToRgbStr(saveData.rgbRight)
    
    if (isEdit.value) {
      await updateSignboard(saveData.id, saveData)
    } else {
      await createSignboard(saveData)
    }
    
    ElMessage.success('保存成功')
    dialogVisible.value = false
    await load()
  } catch (e) {
    console.error('保存失败:', e)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 删除
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除显示板 ${row.macAddress}？`, '确认删除', { type: 'warning' })
    await deleteSignboard(row.id)
    ElMessage.success('删除成功')
    await load()
  } catch {
    // 用户取消
  }
}

onMounted(load)
</script>

<style scoped>
.led-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.led-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #374151;
  flex-shrink: 0;
  transition: .2s;
}
.led-indicator.active {
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e88;
}
.led-val {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  font-family: 'JetBrains Mono', monospace;
}
.rgb-dots {
  display: flex;
  justify-content: center;
  gap: 6px;
}
.rgb-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid #ffffff22;
}
.control-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 4px 0;
}
.control-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
}
.control-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 12px 0 4px;
}
</style>

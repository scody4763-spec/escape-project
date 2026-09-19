<template>
  <div class="page reports-page">
    <div class="page-header report-hero">
      <div>
        <div class="page-title-text">{{ deviceType === 'ceiling-light' ? '吸顶灯报表' : '指示灯报表' }}</div>
        <div class="page-subtitle">围绕设备、趋势与告警的统一分析页面，适合查看近时段整体运行情况</div>
      </div>
      <div class="hero-actions">
        <el-button @click="loadAll" :loading="loading">刷新数据</el-button>
        <el-button type="primary" :icon="Download" @click="handleExport">导出 CSV</el-button>
      </div>
    </div>

    <div class="panel filter-panel">
      <div class="filter-head">
        <div>
          <div class="panel-title">筛选条件</div>
          <div class="panel-sub">可按单设备查看，也可以留空看全部设备的聚合表现</div>
        </div>
        <el-tag type="info">共 {{ overviewList.length }} 台设备进入统计</el-tag>
      </div>
      <el-form inline class="report-form">
        <el-form-item :label="deviceType === 'ceiling-light' ? '设备 ID' : '设备 MAC'">
          <el-select v-model="params.macAddress" clearable filterable style="width: 360px" :placeholder="deviceType === 'ceiling-light' ? '全部设备' : '全部设备'">
            <el-option label="全部设备" value="" />
            <el-option
              v-for="item in sensors"
              :key="deviceType === 'ceiling-light' ? item.deviceId : item.macAddress"
              :label="deviceType === 'ceiling-light' ? `${item.deviceId}${item.address ? ` · ${item.address}` : ''}` : `${item.macAddress}${item.address ? ` · ${item.address}` : ''}`"
              :value="deviceType === 'ceiling-light' ? item.deviceId : item.macAddress"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="统计范围">
          <el-segmented v-model="params.hours" :options="hourOptions" />
        </el-form-item>
        <el-form-item label="趋势字段">
          <el-select v-model="trendField" style="width: 160px" @change="loadTrend">
            <el-option v-for="item in trendOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="summary-grid">
      <div v-for="card in summaryCards" :key="card.label" class="iot-card summary-card">
        <div class="summary-label">{{ card.label }}</div>
        <div class="summary-value" :style="{ color: card.color }">{{ card.value }}</div>
        <div class="summary-desc">{{ card.desc }}</div>
      </div>
    </div>

    <div class="content-grid">
      <div class="panel chart-panel trend-panel">
        <div class="panel-header">
          <div>
            <span class="panel-title">趋势分析</span>
            <span class="panel-sub">{{ currentTrendLabel }} · {{ params.macAddress || '全部设备' }}</span>
          </div>
        </div>
        <div ref="trendChart" class="chart-box large" />
      </div>

      <div class="side-column">
        <div class="panel chart-panel alarm-panel">
          <div class="panel-header">
            <span class="panel-title">告警趋势</span>
            <el-select v-model="alarmDays" size="small" style="width: 100px" @change="loadAlarmStats">
              <el-option label="7 天" :value="7" />
              <el-option label="14 天" :value="14" />
              <el-option label="30 天" :value="30" />
            </el-select>
          </div>
          <div ref="alarmChart" class="chart-box" />
        </div>

        <div class="panel focus-panel">
          <div class="panel-header">
            <span class="panel-title">当前聚焦设备</span>
            <span class="panel-sub">{{ deviceType === 'ceiling-light' ? (currentOverview?.deviceId || '未指定') : (currentOverview?.MacAddress || '未指定') }}</span>
          </div>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="平均温度">{{ formatMetric(currentOverview?.AvgTemp, '°C') }}</el-descriptions-item>
            <el-descriptions-item label="平均湿度">{{ formatMetric(currentOverview?.AvgHum, '%') }}</el-descriptions-item>
            <el-descriptions-item label="平均 AQI">{{ formatMetric(currentOverview?.AvgAQI) }}</el-descriptions-item>
            <el-descriptions-item label="最高温度">{{ formatMetric(currentOverview?.MaxTemp, '°C') }}</el-descriptions-item>
            <el-descriptions-item label="最低温度">{{ formatMetric(currentOverview?.MinTemp, '°C') }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
    </div>

    <div class="panel table-panel">
      <div class="panel-header">
        <span class="panel-title">设备概览表</span>
        <span class="panel-sub">展示当前时间范围内各设备的核心统计结果</span>
      </div>
      <el-table :data="overviewList" stripe>
        <el-table-column :prop="deviceType === 'ceiling-light' ? 'deviceId' : 'MacAddress'" :label="deviceType === 'ceiling-light' ? '设备 ID' : 'MAC 地址'" min-width="220" show-overflow-tooltip />
        <el-table-column prop="AvgTemp" label="平均温度" min-width="120">
          <template #default="scope">{{ formatMetric(scope.row.AvgTemp, '°C') }}</template>
        </el-table-column>
        <el-table-column prop="AvgHum" label="平均湿度" min-width="120">
          <template #default="scope">{{ formatMetric(scope.row.AvgHum, '%') }}</template>
        </el-table-column>
        <el-table-column prop="AvgAQI" label="平均 AQI" min-width="120">
          <template #default="scope">{{ formatMetric(scope.row.AvgAQI) }}</template>
        </el-table-column>
        <el-table-column prop="MaxTemp" label="最高温度" min-width="120">
          <template #default="scope">{{ formatMetric(scope.row.MaxTemp, '°C') }}</template>
        </el-table-column>
        <el-table-column prop="MinTemp" label="最低温度" min-width="120">
          <template #default="scope">{{ formatMetric(scope.row.MinTemp, '°C') }}</template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import * as echarts from 'echarts'
import { getOverview, getTrend, getAlarmStats, exportReport } from '@/api/report'
import { listSensors } from '@/api/sensor'
import { listCeilingLights } from '@/api/ceilingLight'
import { ElMessage } from 'element-plus'
import { Download } from '@element-plus/icons-vue'

const route = useRoute()
const deviceType = computed(() => {
  if (route.path.includes('ceiling-light')) return 'ceiling-light'
  return 'sensor'
})

const loading = ref(false)
const trendField = ref('temp')
const alarmDays = ref(7)
const overviewList = ref([])
const sensors = ref([])
const trendChart = ref()
const alarmChart = ref()
let tChart = null
let aChart = null
let resizeHandler = null

const params = ref({ macAddress: '', hours: 24 })
const hourOptions = [
  { label: '1小时', value: 1 },
  { label: '6小时', value: 6 },
  { label: '24小时', value: 24 },
  { label: '48小时', value: 48 },
  { label: '7天', value: 168 }
]
const trendOptions = [
  { label: '温度', value: 'temp', color: '#22c55e' },
  { label: '湿度', value: 'hum', color: '#3b82f6' },
  { label: 'AQI', value: 'AQI', color: '#f59e0b' },
  { label: 'TVOC', value: 'TVOC', color: '#8b5cf6' },
  { label: 'ECO2', value: 'ECO2', color: '#06b6d4' },
  { label: '电量', value: 'electricity', color: '#ef4444' }
]

const currentTrend = computed(() => trendOptions.find(item => item.value === trendField.value) || trendOptions[0])
const currentTrendLabel = computed(() => currentTrend.value.label)
const currentOverview = computed(() => overviewList.value[0] || null)
const summaryCards = computed(() => {
  const total = overviewList.value.length
  const avgTemp = total ? overviewList.value.reduce((sum, item) => sum + (Number(item.AvgTemp) || 0), 0) / total : null
  const avgHum = total ? overviewList.value.reduce((sum, item) => sum + (Number(item.AvgHum) || 0), 0) / total : null
  const maxTemp = total ? Math.max(...overviewList.value.map(item => Number(item.MaxTemp) || 0)) : null
  const avgAqi = total ? overviewList.value.reduce((sum, item) => sum + (Number(item.AvgAQI) || 0), 0) / total : null
  return [
    { label: '统计设备数', value: total || '—', color: '#6366f1', desc: '当前筛选条件下纳入统计的设备数量' },
    { label: '时间范围', value: `${params.value.hours}h`, color: '#94a3b8', desc: '当前报表分析窗口' },
    { label: '综合平均温度', value: formatMetric(avgTemp, '°C'), color: '#ef4444', desc: '对设备平均温度再次汇总' },
    { label: '综合平均湿度', value: formatMetric(avgHum, '%'), color: '#3b82f6', desc: '便于快速判断环境湿度水平' },
    { label: '最高温度峰值', value: formatMetric(maxTemp, '°C'), color: '#f97316', desc: '当前范围内的最大温度值' },
    { label: '综合平均 AQI', value: formatMetric(avgAqi), color: '#f59e0b', desc: '反映整体空气质量变化' }
  ]
})

function formatMetric(value, unit = '') {
  if (value == null || Number.isNaN(value)) return '—'
  const text = typeof value === 'number' ? value.toFixed(1) : value
  return `${text}${unit}`
}
function normalizeOverview(res) {
  const raw = res?.data ?? res ?? []
  return Array.isArray(raw) ? raw : raw ? [raw] : []
}
function initCharts() {
  if (!trendChart.value || !alarmChart.value) return
  tChart = echarts.init(trendChart.value, null, { renderer: 'canvas' })
  aChart = echarts.init(alarmChart.value, null, { renderer: 'canvas' })
  resizeHandler = () => {
    tChart?.resize()
    aChart?.resize()
  }
  window.addEventListener('resize', resizeHandler)
}
function setTrendChart(data) {
  if (!tChart) return
  tChart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 44, right: 20, bottom: 36, left: 48 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.map(item => item.time || ''), axisLabel: { color: '#64748b', rotate: 30 } },
    yAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#1e345633' } } },
    series: [{
      name: currentTrendLabel.value,
      type: 'line',
      smooth: true,
      symbol: 'none',
      data: data.map(item => item.value ?? 0),
      lineStyle: { color: currentTrend.value.color, width: 3 },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: `${currentTrend.value.color}55` },
          { offset: 1, color: `${currentTrend.value.color}08` }
        ])
      }
    }],
    graphic: [{
      type: 'text',
      left: 48,
      top: 8,
      style: {
        text: '时间为UTC (Z结尾)，中国标准时间 = UTC+8',
        fontSize: 12,
        fill: '#94a3b8'
      }
    }]
  })
}

function setAlarmChart(data) {
  if (!aChart) return
  aChart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 20, right: 16, bottom: 36, left: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.map(item => item.day || item.date || ''), axisLabel: { color: '#64748b' } },
    yAxis: { type: 'value', axisLabel: { color: '#64748b' }, splitLine: { lineStyle: { color: '#1e345633' } } },
    series: [{
      type: 'bar',
      data: data.map(item => item.count ?? 0),
      barMaxWidth: 26,
      itemStyle: { color: '#f59e0b', borderRadius: [6, 6, 0, 0] }
    }]
  })
}

async function loadSensors() {
  try {
    if (deviceType.value === 'ceiling-light') {
      const res = await listCeilingLights()
      sensors.value = res?.data?.list ?? res?.list ?? res?.data ?? res ?? []
    } else {
      const res = await listSensors()
      sensors.value = res?.data?.list ?? res?.list ?? res?.data ?? res ?? []
    }
  } catch {
    sensors.value = []
  }
}

async function loadOverview() {
  try {
    const p = { hours: params.value.hours }
    if (params.value.macAddress) p.macAddress = params.value.macAddress
    const res = await getOverview(p)
    overviewList.value = normalizeOverview(res)
  } catch {
    overviewList.value = []
  }
}

async function loadTrend() {
  try {
    const p = { hours: params.value.hours, field: trendField.value }
    if (params.value.macAddress) p.macAddress = params.value.macAddress
    const res = await getTrend(p)
    setTrendChart(res?.data ?? res ?? [])
  } catch {
    setTrendChart([])
  }
}

async function loadAlarmStats() {
  try {
    const res = await getAlarmStats({ days: alarmDays.value })
    setAlarmChart(res?.data ?? res ?? [])
  } catch {
    setAlarmChart([])
  }
}

async function loadAll() {
  loading.value = true
  try {
    await Promise.all([loadOverview(), loadTrend(), loadAlarmStats()])
  } finally {
    loading.value = false
  }
}

async function handleExport() {
  try {
    const p = { hours: params.value.hours }
    if (params.value.macAddress) p.macAddress = params.value.macAddress
    const blob = await exportReport(p)
    const fileBlob = blob instanceof Blob ? blob : new Blob([blob])
    const url = URL.createObjectURL(fileBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sensor_report_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

watch(() => params.value.hours, () => loadAll())
watch(() => params.value.macAddress, () => loadAll())

onMounted(async () => {
  await loadSensors()
  await nextTick()
  initCharts()
  await loadAll()
})

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler)
  }
  tChart?.dispose()
  aChart?.dispose()
})
</script>

<style scoped>
.reports-page {
  gap: 16px;
}

.page-subtitle {
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.report-hero,
.filter-head,
.panel-header,
.hero-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-panel {
  padding: 20px;
}

.report-form {
  margin-top: 16px;
}

.report-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
}

.summary-card {
  padding: 18px;
  min-height: 120px;
}

.summary-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.summary-value {
  margin-top: 12px;
  font-size: 28px;
  font-weight: 700;
  line-height: 1.1;
}

.summary-desc {
  margin-top: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.5;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.8fr 1fr;
  gap: 16px;
}

.side-column {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
}

.chart-panel,
.focus-panel,
.table-panel {
  padding: 18px;
}

.chart-box {
  min-height: 280px;
}

.chart-box.large {
  min-height: 420px;
}

.table-panel :deep(.el-table) {
  margin-top: 12px;
}

@media (max-width: 1400px) {
  .summary-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 1100px) {
  .content-grid,
  .summary-grid {
    grid-template-columns: 1fr;
  }

  .side-column {
    grid-template-rows: auto;
  }
}
</style>

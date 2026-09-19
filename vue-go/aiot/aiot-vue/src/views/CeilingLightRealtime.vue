<template>
  <div class="page realtime-page">
    <div class="page-header">
      <div>
        <div class="page-title-text">吸顶灯实时数据</div>
        <div class="page-subtitle">单设备实时折线图，连接后端 /api/ws/device-data 获取实时传感器数据</div>
      </div>
      <div class="header-actions">
        <el-tag :type="connected ? 'success' : 'info'">{{ connected ? 'WS 已连接' : 'WS 未连接' }}</el-tag>
        <el-button :type="connected ? 'danger' : 'primary'" @click="toggleWs">{{ connected ? '断开连接' : '连接 WS' }}</el-button>
      </div>
    </div>

    <div class="panel toolbar">
      <el-form inline>
        <el-form-item label="设备 ID">
          <el-select v-model="selectedDeviceId" filterable clearable style="width:420px" placeholder="请选择一个吸顶灯设备">
            <el-option v-for="item in devices" :key="item.deviceId" :label="`${item.deviceId}${item.address ? ` · ${item.address}` : ''}`" :value="item.deviceId" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div class="stats-grid">
      <div v-for="card in cards" :key="card.label" class="iot-card stat-card">
        <div class="stat-label">{{ card.label }}</div>
        <div class="stat-value" :style="{ color: card.color }">{{ card.value }}</div>
      </div>
    </div>

    <div class="panel chart-panel">
      <div class="panel-header">
        <span class="panel-title">实时折线图</span>
        <span class="panel-sub">当前设备：{{ selectedDeviceId || '未选择' }} · 已显示 {{ rows.length }} 条</span>
      </div>
      <div ref="chartRef" class="chart-box" />
    </div>

    <div class="panel">
      <div class="panel-header">
        <span class="panel-title">最新数据</span>
        <span class="panel-sub">仅展示当前订阅设备的最新值</span>
      </div>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="时间">{{ latest.time || '—' }}</el-descriptions-item>
        <el-descriptions-item label="设备ID">{{ latest.deviceId || '—' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag size="small" :type="statusTagType(latest.status)">{{ latest.status || '—' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="火灾等级">
          <el-tag size="small" :type="levelTagType(latest.fusionLevel)">{{ latest.fusionLevel || '—' }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">
        <span style="font-size:12px;color:var(--el-text-color-secondary)">热成像</span>
      </el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="最高温度">{{ latest.tMax ?? '—' }} °C</el-descriptions-item>
        <el-descriptions-item label="最低温度">{{ latest.tMin ?? '—' }} °C</el-descriptions-item>
        <el-descriptions-item label="平均温度">{{ latest.tAvg ?? '—' }} °C</el-descriptions-item>
        <el-descriptions-item label="环境温度">{{ latest.tAmbient ?? '—' }} °C</el-descriptions-item>
        <el-descriptions-item label="温差">{{ latest.tDelta ?? '—' }} °C</el-descriptions-item>
        <el-descriptions-item label="升温速率">{{ latest.tRiseRate ?? '—' }} °C/s</el-descriptions-item>
        <el-descriptions-item label="高温像素数">{{ latest.hotSpotCnt ?? '—' }}</el-descriptions-item>
        <el-descriptions-item label="火灾概率">
          <span v-if="latest.probability != null" style="color:var(--el-color-danger);font-weight:600">
            {{ formatPercent(latest.probability) }}
          </span>
          <span v-else>—</span>
        </el-descriptions-item>
      </el-descriptions>

	  <el-divider content-position="left">
        <span style="font-size:12px;color:var(--el-text-color-secondary)">气体</span>
      </el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="TVOC">{{ latest.tvoc ?? '—' }} ppb</el-descriptions-item>
        <el-descriptions-item label="eCO2">{{ latest.eco2 ?? '—' }} ppm</el-descriptions-item>
        <el-descriptions-item label="AQI">
          <span>{{ latest.aqi ?? '—' }}</span>
          <el-tag 
            v-if="latest.aqi != null && latest.aqi !== ''" 
            size="small" 
            :type="aqiTagType(latest.aqi)" 
            style="margin-left:8px"
          >
            {{ aqiText(latest.aqi) }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>
      
      <!-- AQI 等级说明 -->
      <div v-if="latest.aqi != null && latest.aqi !== ''" style="margin-top:8px;padding:8px;background:#f5f7fa;border-radius:4px;font-size:12px;">
        <strong>AQI 空气质量等级：</strong>
        <el-tag size="small" type="success" style="margin:0 4px">1=优 🌿</el-tag>
        <el-tag size="small" type="" style="margin:0 4px">2=良 😊</el-tag>
        <el-tag size="small" type="warning" style="margin:0 4px">3=中 😐</el-tag>
        <el-tag size="small" type="danger" style="margin:0 4px">4=差 😷</el-tag>
        <el-tag size="small" type="danger" plain style="margin:0 4px">5=不健康 ☠️</el-tag>
      </div>

      <el-divider content-position="left">
        <span style="font-size:12px;color:var(--el-text-color-secondary)">温湿度</span>
      </el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="温度">{{ latest.temperature ?? '—' }} °C</el-descriptions-item>
        <el-descriptions-item label="湿度">{{ latest.humidity ?? '—' }} %</el-descriptions-item>
        <el-descriptions-item label="湿度变化率">{{ latest.humidityRate ?? '—' }} %/s</el-descriptions-item>
      </el-descriptions>

      <el-divider content-position="left">
        <span style="font-size:12px;color:var(--el-text-color-secondary)">融合结果</span>
      </el-divider>
      <el-descriptions :column="4" border>
        <el-descriptions-item label="m(火灾)">{{ latest.mFire != null ? formatNumber(latest.mFire, 3) : '—' }}</el-descriptions-item>
        <el-descriptions-item label="m(无火灾)">{{ latest.mNoFire != null ? formatNumber(latest.mNoFire, 3) : '—' }}</el-descriptions-item>
        <el-descriptions-item label="m(不确定)">{{ latest.mUncertain != null ? formatNumber(latest.mUncertain, 3) : '—' }}</el-descriptions-item>
        <el-descriptions-item label="冲突系数">{{ latest.conflict != null ? formatNumber(latest.conflict, 3) : '—' }}</el-descriptions-item>
      </el-descriptions>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { listCeilingLights } from '@/api/ceilingLight'

const WS_URL = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws/device-data`
const MAX_POINTS = 40

const devices         = ref([])
const selectedDeviceId = ref('')
const connected       = ref(false)
const rows            = ref([])
const chartRef        = ref(null)
let ws = null
let chart = null
let resizeHandler = null

const latest = computed(() => rows.value[0] || {})

// ✅ 格式化函数：百分比（保留1位小数）
function formatPercent(value) {
  if (value == null || value === '') return '—'
  return (parseFloat(value) * 100).toFixed(1) + '%'
}

// ✅ 格式化函数：数字（保留指定位数）
function formatNumber(value, decimals = 1) {
  if (value == null || value === '') return '—'
  return parseFloat(value).toFixed(decimals)
}

const cards = computed(() => {
  const level = latest.value.fusionLevel || 'unknown'
  const levelColor = { safe: '#22c55e', watch: '#f59e0b', warning: '#f97316', alarm: '#ef4444' }[level] || '#94a3b8'
  return [
    { label: '当前设备', value: selectedDeviceId.value || '未选择', color: '#6366f1' },
    { label: '火灾等级', value: level, color: levelColor },
    { label: '火灾概率', value: formatPercent(latest.value.probability), color: '#ef4444' },
    { label: '数据条数', value: rows.value.length, color: '#f59e0b' }
  ]
})

function statusTagType(s) {
  return { normal: 'success', warning: 'warning', emergency: 'danger' }[s] || 'info'
}
function levelTagType(l) {
  return { safe: 'success', watch: 'warning', warning: 'warning', alarm: 'danger' }[l] || 'info'
}

function aqiText(aqi) {
  const levelMap = {
    1: '优',
    2: '良',
    3: '中',
    4: '差',
    5: '不健康'
  }
  return levelMap[aqi] || '未知'
}

function aqiTagType(aqi) {
  const colorMap = {
    1: 'success',
    2: '',
    3: 'warning',
    4: 'danger',
    5: 'danger'
  }
  return colorMap[aqi] || 'info'
}

function normalizeMessage(message) {
  const deviceId = Object.keys(message || {})[0]
  const raw = deviceId ? message[deviceId] || {} : {}

  const thermal = raw.sensors?.thermal || {}
  const gas = raw.sensors?.gas || {}
  const humidity = raw.sensors?.humidity || {}
  const fusion = raw.sensors?.fusion || {}

  return {
    time: new Date().toLocaleTimeString(),
    deviceId: deviceId || '--',
    status: raw.status || 'unknown',
    
    fusionLevel: raw.fusionLevel || 'unknown',
    probability: raw.probability ?? null,
    
    tMax: thermal.t_max ?? null,
    tMin: thermal.t_min ?? null,
    tAvg: thermal.t_avg ?? null,
    tAmbient: thermal.t_ambient ?? null,
    tDelta: thermal.t_delta ?? null,
    tRiseRate: thermal.t_rise_rate ?? null,
    hotSpotCnt: thermal.hot_spot_cnt ?? null,
    
    tvoc: gas.tvoc ?? null,
    eco2: gas.eco2 ?? null,
    aqi: gas.aqi ?? null,
    
    temperature: humidity.temperature ?? null,
    humidity: humidity.humidity ?? null,
    humidityRate: humidity.humidity_rate ?? null,
    
    mFire: fusion.m_fire ?? null,
    mNoFire: fusion.m_no_fire ?? null,
    mUncertain: fusion.m_uncertain ?? null,
    conflict: fusion.conflict ?? null
  }
}

function initChart() {
  if (!chartRef.value) return
  chart = echarts.init(chartRef.value, null, { renderer: 'canvas' })
  resizeHandler = () => chart?.resize()
  window.addEventListener('resize', resizeHandler)
  renderChart()
}

function renderChart() {
  if (!chart) return
  
  // ✅ 自定义Tooltip格式化函数 - 关键修复！
  const tooltipFormatter = function(params) {
    let result = `${params[0].axisValue}<br/>`
    params.forEach(item => {
      const value = item.value !== null && item.value !== undefined ? item.value : '—'
      
      // 根据不同字段类型进行格式化
      if (item.seriesName === '火灾概率') {
        // 火灾概率：保留1位小数 + 百分号
        const probValue = typeof value === 'number' ? parseFloat(value.toFixed(1)) : value
        result += `${item.marker} ${item.seriesName} ${probValue}%<br/>`
      } else if (typeof value === 'number') {
        // 其他数值：根据大小决定小数位数
        if (Math.abs(value) >= 100) {
          result += `${item.marker} ${item.seriesName} ${value.toFixed(0)}<br/>`
        } else if (Math.abs(value) >= 10) {
          result += `${item.marker} ${item.seriesName} ${value.toFixed(1)}<br/>`
        } else {
          result += `${item.marker} ${item.seriesName} ${value.toFixed(1)}<br/>`
        }
      } else {
        result += `${item.marker} ${item.seriesName} ${value}<br/>`
      }
    })
    return result
  }

  chart.setOption({
    backgroundColor: 'transparent',
    grid: { top: 24, right: 20, bottom: 32, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#131e34',
      borderColor: '#1e3456',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: tooltipFormatter  // ✅ 使用自定义格式化函数
    },
    legend: {
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 12 }
    },
    xAxis: {
      type: 'category',
      data: rows.value.map(item => item.time).reverse(),
      axisLine: { lineStyle: { color: '#1e3456' } },
      axisLabel: { color: '#64748b', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e345633' } }
    },
    series: [
      {
        name: '最高温度',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: rows.value.map(row => row.tMax ?? null).reverse(),
        lineStyle: { color: '#ef4444', width: 3 },
        itemStyle: { color: '#ef4444' }
      },
      {
        name: 'TVOC',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: rows.value.map(row => row.tvoc ?? null).reverse(),
        lineStyle: { color: '#f59e0b', width: 3 },
        itemStyle: { color: '#f59e0b' }
      },
      {
        name: '火灾概率',
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        data: rows.value.map(row => row.probability != null ? parseFloat((row.probability * 100).toFixed(1)) : null).reverse(),
        lineStyle: { color: '#8b5cf6', width: 3 },
        itemStyle: { color: '#8b5cf6' }
      }
    ]
  })
}

function sendSubscribe() {
  if (!ws || ws.readyState !== WebSocket.OPEN || !selectedDeviceId.value) return
  
  // ✅ 同时订阅 deviceId 和可能的MAC地址
  const subscribeKeys = [selectedDeviceId.value]
  
  // 从设备列表中查找对应的MAC地址
  const device = devices.value.find(d => d.deviceId === selectedDeviceId.value)
  if (device?.macAddress) {
    subscribeKeys.push(device.macAddress)
    subscribeKeys.push('ESP32_' + device.macAddress)
  }
  
  console.log('📡 订阅频道:', subscribeKeys)
  ws.send(JSON.stringify({ subscribe: subscribeKeys }))
}

function connect() {
  if (!selectedDeviceId.value) {
    ElMessage.warning('请先选择一个设备')
    return
  }
  if (ws) ws.close()
  ws = new WebSocket(WS_URL)
  ws.onopen = () => {
    connected.value = true
    sendSubscribe()
  }
  ws.onmessage = (event) => {
    try {
      const row = normalizeMessage(JSON.parse(event.data))
      
      // ✅ 放宽过滤条件：只要deviceId匹配，或者MAC地址匹配就接收
      const device = devices.value.find(d => d.deviceId === selectedDeviceId.value)
      const isMatch = row.deviceId === selectedDeviceId.value || 
                      (device?.macAddress && row.deviceId?.includes(device.macAddress))
      
      if (!isMatch) return
      
      console.log('📥 收到数据:', row.deviceId, '时间:', row.time)
      rows.value.unshift(row)
      rows.value = rows.value.slice(0, MAX_POINTS)
      renderChart()
    } catch (e) {
      console.warn('解析消息失败:', e)
    }
  }
  ws.onerror = () => ElMessage.error('WebSocket 连接失败')
  ws.onclose = () => {
    connected.value = false
    ws = null
  }
}

function toggleWs() {
  if (connected.value) ws?.close()
  else connect()
}

async function loadDevices() {
  const res = await listCeilingLights()
  devices.value = res?.list ?? res ?? []
  if (!selectedDeviceId.value && devices.value.length) selectedDeviceId.value = devices.value[0].deviceId
}

watch(selectedDeviceId, (val, oldVal) => {
  if (val === oldVal) return
  rows.value = []
  renderChart()
  if (connected.value && val) connect()
})

onMounted(async () => {
  await loadDevices()
  await nextTick()
  initChart()
})
onUnmounted(() => {
  ws?.close()
  window.removeEventListener('resize', resizeHandler)
  chart?.dispose()
})
</script>

<style scoped>
.realtime-page { gap: 16px; }
.page-subtitle { margin-top: 6px; font-size: 12px; color: var(--el-text-color-secondary); }
.header-actions { display: flex; align-items: center; gap: 12px; }
.toolbar { padding-bottom: 4px; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.stat-card { padding: 18px; min-width: 350px; }
.stat-label { font-size: 12px; color: var(--el-text-color-secondary); margin-bottom: 10px; }
.stat-value { font-size: 24px; font-weight: 700; word-break: break-all; }
.chart-panel { display: flex; flex-direction: column; }
.chart-box { height: 420px; }
@media (max-width: 1200px) { .stats-grid { grid-template-columns: 1fr; } }
</style>
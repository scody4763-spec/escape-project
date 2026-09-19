<template>
  <div class="page">
    <!-- Stat Cards -->
    <div class="stats-grid">
      <div v-for="s in stats" :key="s.label" class="stat-card iot-card">
        <div class="stat-header">
          <div class="stat-label">{{ s.label }}</div>
        </div>
        <div class="stat-content">
          <div class="stat-icon" :style="{ background: s.color + '18', color: s.color, boxShadow: `0 0 16px ${s.color}22` }">
            <el-icon><component :is="s.icon" /></el-icon>
          </div>
          <div class="stat-value">
            <span v-if="loading">—</span>
            <span v-else>{{ s.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Middle row - 上下布局 -->
    <div class="mid-column">
      <!-- Sensor nodes -->
      <div class="panel sensor-panel">
        <div class="panel-header">
          <span class="panel-title">指示灯节点状态</span>
          <span class="panel-sub">实时在线监测</span>
        </div>
        <div v-if="loading" class="center-loading"><el-icon class="spin"><Loading /></el-icon></div>
        <div v-else-if="sensors.length === 0" class="empty-tip">暂无指示灯数据</div>
        <div v-else class="sensor-grid">
          <div
            v-for="s in sensors"
            :key="s.id"
            class="sensor-node"
            :class="isOnline(s.macAddress) ? 'node-online' : 'node-offline'"
          >
            <div class="node-head">
              <span class="dot" :class="isOnline(s.macAddress) ? 'dot-online' : 'dot-offline'" />
              <span class="node-status-txt">{{ isOnline(s.macAddress) ? 'ONLINE' : 'OFFLINE' }}</span>
            </div>
            <div class="node-mac mono">{{ s.macAddress }}</div>
            <div class="node-addr">{{ s.address || '未设置地址' }}</div>
          </div>
        </div>
      </div>

      <!-- Recent alerts -->
      <div class="panel alert-panel">
        <div class="panel-header">
          <span class="panel-title">最近告警</span>
          <router-link to="/alerts" class="panel-link">查看全部 →</router-link>
        </div>
        <div v-if="loading" class="center-loading"><el-icon class="spin"><Loading /></el-icon></div>
        <div v-else-if="alerts.length === 0" class="empty-tip">暂无告警记录</div>
        <div v-else class="alert-list">
          <div v-for="a in alerts.slice(0, 8)" :key="a.id" class="alert-row">
            <span class="dot" :class="alertDotClass(a.status)" />
            <div class="alert-info">
              <div class="alert-type">{{ alertTypeLabel(a.alertType) }}</div>
              <div class="alert-mac mono">{{ a.macAddress }}</div>
            </div>
            <el-tag size="small" :type="alertTagType(a.status)" effect="plain">
              {{ alertStatusLabel(a.status) }}
            </el-tag>
          </div>
        </div>
      </div>
    </div>

    <!-- Boards & Signboards quick info -->
    <!-- <div class="bottom-row">
      <div class="panel" style="flex:1">
        <div class="panel-header">
          <span class="panel-title">控制板 ({{ boards.length }})</span>
          <router-link to="/boards" class="panel-link">管理 →</router-link>
        </div>
        <div class="chip-list">
          <div v-for="b in boards" :key="b.id" class="chip">
            <el-icon><Grid /></el-icon>
            {{ b.name }}
            <el-tag size="small" :type="b.status === 1 ? 'success' : 'info'" effect="plain">
              {{ b.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </div>
          <div v-if="!boards.length" class="empty-tip">暂无控制板</div>
        </div>
      </div>

      <div class="panel" style="flex:1">
        <div class="panel-header">
          <span class="panel-title">显示板 ({{ signboards.length }})</span>
          <router-link to="/signboards" class="panel-link">管理 →</router-link>
        </div>
        <div class="chip-list">
          <div v-for="sb in signboards" :key="sb.id" class="chip">
            <el-icon><Monitor /></el-icon>
            <span class="mono">{{ sb.macAddress }}</span>
            <div class="led-dots">
              <span class="led-dot" :style="{ background: sb.led ? '#22c55e' : '#374151' }" title="LED" />
              <span class="led-dot" :style="{ background: sb.buzzer ? '#f59e0b' : '#374151' }" title="蜂鸣器" />
              <span class="led-dot" :style="{ background: sb.electricitySwitch ? '#6366f1' : '#374151' }" title="供电" />
            </div>
          </div>
          <div v-if="!signboards.length" class="empty-tip">暂无显示板</div>
        </div>
      </div>
    </div> -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listSensors, getSensorStatus } from '@/api/sensor'
import { listAlerts } from '@/api/alert'
import { listBoards } from '@/api/board'
import { listSignboards } from '@/api/signboard'
import { listCeilingLights, getCeilingLightStatus } from '@/api/ceilingLight'

const loading        = ref(true)
const sensors        = ref([])
const sensorSt       = ref({})
const alerts         = ref([])
const boards         = ref([])
const signboards     = ref([])
const ceilingLights  = ref([])
const ceilingLightSt = ref({})

const stats = ref([
  { label: '指示灯总数', value: 0, icon: 'Cpu',        color: '#6366f1' },
  { label: '在线指示灯', value: 0, icon: 'Connection',  color: '#22c55e' },
  { label: '控制板总数', value: 0, icon: 'Grid',        color: '#3b82f6' },
  { label: '吸顶灯总数', value: 0, icon: 'Sunny',       color: '#f97316' },
  { label: '在线吸顶灯', value: 0, icon: 'Lightning',   color: '#22c55e' },
  { label: '活跃告警',   value: 0, icon: 'Bell',        color: '#f59e0b' },
])

const isOnline = (mac) => sensorSt.value[mac] === 1

function alertDotClass(s) { return ['dot-warning','dot-warn','dot-online'][s] || 'dot-warning' }
function alertTagType(s)  { return ['warning','','success'][s] || 'warning' }
function alertStatusLabel(s) { return ['待处理','处理中','已解决'][s] ?? '未知' }
function alertTypeLabel(t)   { return { 1:'温度异常', 2:'湿度异常', 3:'设备离线', 4:'火焰告警' }[t] || `告警类型${t}` }

onMounted(async () => {
  try {
    const [sRes, stRes, aRes, bRes, sbRes, clRes, clStRes] = await Promise.allSettled([
      listSensors(), getSensorStatus(), listAlerts({ status: -1 }), listBoards(), listSignboards(),
      listCeilingLights(), getCeilingLightStatus()
    ])

    sensors.value        = sRes.value?.list       || []
    sensorSt.value       = stRes.value?.status || {}
    alerts.value         = aRes.value?.list    || []
    boards.value         = bRes.value?.list    || []
    signboards.value     = sbRes.value?.list   || []
    ceilingLights.value  = clRes.value?.list   || []
    ceilingLightSt.value = clStRes.value?.status || {}

    const online = sensors.value.filter(s => isOnline(s.macAddress)).length
    const clOnline = ceilingLights.value.filter(s => {
      const st = ceilingLightSt.value[s.deviceId]
      return st === 'online' || st === 1
    }).length

    stats.value[0].value = sensors.value.length
    stats.value[1].value = online
    stats.value[2].value = boards.value.length
    stats.value[3].value = ceilingLights.value.length
    stats.value[4].value = clOnline
    stats.value[5].value = alerts.value.filter(a => a.status === 0).length
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* Stats */
.stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 16px; }
.stat-card  { display: flex; flex-direction: column; padding: 20px; }
.stat-header { margin-bottom: 16px; }
.stat-label { font-size: 15px; color: var(--el-text-color-primary); font-weight: 500; }
.stat-content { display: flex; align-items: center; gap: 16px; }
.stat-icon  { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.stat-value { font-size: 28px; font-weight: 700; color: var(--el-text-color-primary); line-height: 1; }

/* Middle column - 上下布局 */
.mid-column { display: flex; flex-direction: column; gap: 16px; }
.sensor-panel { height: 300px; overflow-y: auto; }
.alert-panel { height: 250px; overflow-y: auto; }

/* Sensor grid */
.sensor-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); 
  gap: 10px; 
  padding-right: 4px; /* 为滚动条留出空间 */
}
.sensor-node {
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 12px;
  transition: .2s;
}
.node-online  { border-color: #22c55e33; background: #22c55e08; }
.node-offline { border-color: #ef444433; background: #ef444408; }
.node-head    { display: flex; align-items: center; margin-bottom: 8px; }
.node-status-txt { font-size: 10px; font-weight: 600; letter-spacing: .5px; color: var(--el-text-color-secondary); }
.node-mac  { font-size: 11px; color: #6366f1; margin-bottom: 4px; word-break: break-all; }
.node-addr { font-size: 11px; color: var(--el-text-color-secondary); }

/* Alert list */
.alert-list { 
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
  padding-right: 4px; /* 为滚动条留出空间 */
}
.alert-row  { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  padding: 8px 10px; 
  border-radius: 6px; 
  background: var(--el-fill-color-lighter); 
  flex-shrink: 0; /* 防止压缩 */
}
.alert-info { flex: 1; min-width: 0; }
.alert-type { font-size: 12px; color: var(--el-text-color-primary); }
.alert-mac  { font-size: 11px; color: var(--el-text-color-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Bottom row */
.bottom-row { display: flex; gap: 16px; }
.chip-list  { display: flex; flex-direction: column; gap: 8px; }
.chip       { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; background: var(--el-fill-color-lighter); font-size: 13px; color: var(--el-text-color-regular); }
.chip .el-icon { color: #6366f1; }
.led-dots   { display: flex; gap: 4px; margin-left: auto; }
.led-dot    { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

/* Misc */
.center-loading { height: 120px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #6366f1; }
.empty-tip { font-size: 13px; color: var(--el-text-color-secondary); padding: 20px 0; text-align: center; }
@keyframes spin { to { transform: rotate(360deg) } }
.spin { animation: spin 1s linear infinite; }
</style>

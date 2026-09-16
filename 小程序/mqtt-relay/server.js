/**
 * MQTT WebSocket 中继服务器 + 测试消息发布器
 * 
 * 作用：将 MQTT 数据转为 HTTP 接口，供微信小程序真机调试时使用
 * 原因：微信小程序真机不支持 WebSocket 连接 IP 地址
 * 
 * 使用方法：
 *   1. 安装依赖：  cd mqtt-relay && npm install
 *   2. 启动服务器： node server.js
 *   3. 小程序会自动连接本中继服务器获取数据
 *   4. 浏览器打开 http://localhost:3000/publish 可发送测试消息
 * 
 * 注意：启动后请保持此终端窗口运行，不要关闭
 */

const mqtt = require('mqtt');
const http = require('http');
const os = require('os');

// ===== 配置 =====
const MQTT_CONFIG = {
  url: 'wss://42.193.218.29:8084/mqtt',
  username: 'indicator_light',
  password: 'indicator_light',
  topics: ['indicator_light/data', 'ceiling_light/data']
};

const RELAY_PORT = 3000;

// ===== 数据存储 =====
const latestData = {};
let connected = false;
let fireAlert = null;  // 最新的火灾警报状态

// ===== MQTT 客户端 =====
const clientId = 'relay_' + Date.now() + '_' + Math.random().toString(16).slice(2, 8);
const client = mqtt.connect(MQTT_CONFIG.url, {
  username: MQTT_CONFIG.username,
  password: MQTT_CONFIG.password,
  clientId: clientId,
  rejectUnauthorized: false  // 忽略 SSL 证书错误
});

client.on('connect', () => {
  connected = true;
  console.log('✅ MQTT 已连接');
  MQTT_CONFIG.topics.forEach(topic => {
    client.subscribe(topic, (err) => {
      if (err) {
        console.error('❌ 订阅失败:', topic, err);
      } else {
        console.log('📡 已订阅:', topic);
      }
    });
  });
});

client.on('message', (topic, payload) => {
  const str = payload.toString();
  latestData[topic] = {
    payload: str,
    time: Date.now(),
    timeStr: new Date().toLocaleTimeString()
  };
  console.log(`[${new Date().toLocaleTimeString()}] ${topic}: ${str.slice(0, 120)}`);
});

client.on('error', (err) => {
  console.error('❌ MQTT 错误:', err.message);
});

client.on('close', () => {
  connected = false;
  console.log('⚠️ MQTT 已断开');
});

// ===== HTTP 服务器 =====
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// 解析 POST 请求体
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve(null);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = req.url;
  const method = req.method;

  // ===== API 接口 =====
  if (url === '/api/data' && method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      connected: connected,
      data: latestData,
      time: Date.now()
    }));
    return;
  }

  if (url === '/api/status' && method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
      connected: connected,
      topics: MQTT_CONFIG.topics,
      clientId: clientId,
      dataCount: Object.keys(latestData).length,
      uptime: Math.floor((Date.now() - startTime) / 1000) + 's'
    }));
    return;
  }

  // ===== MQTT 消息发布接口 =====
  if (url === '/api/publish' && method === 'POST') {
    const body = await parseBody(req);
    if (!body || !body.topic || !body.payload) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: '缺少 topic 或 payload', example: { topic: 'indicator_light/data', payload: '{"ESP32_D8:BC:38:78:24:B8":{"buzzer":2}}' } }));
      return;
    }
    client.publish(body.topic, body.payload, (err) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (err) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: err.message }));
      } else {
        console.log(`📤 已发布 [${body.topic}]: ${body.payload.slice(0, 100)}`);
        res.end(JSON.stringify({ success: true, message: '已发布' }));
      }
    });
    return;
  }

  // ===== 测试页面（HTML 界面） =====
  if (url === '/publish' || url === '/') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(getTestPageHTML());
    return;
  }

  // 404
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ error: 'not found' }));
});

const startTime = Date.now();
server.listen(RELAY_PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log('\n' + '='.repeat(50));
  console.log('🚀 MQTT 中继服务器已启动!');
  console.log('='.repeat(50));
  console.log('');
  console.log('📱 小程序数据接口:');
  console.log(`   http://${localIP}:${RELAY_PORT}/api/data`);
  console.log('');
  console.log('🖱️  测试消息发布器 (浏览器打开):');
  console.log(`   http://localhost:${RELAY_PORT}/publish`);
  console.log('');
  console.log('📡 等待 MQTT 数据中...');
  console.log('');
  console.log('⚠️  请保持此窗口运行，关闭后小程序将无法获取数据');
  console.log('='.repeat(50) + '\n');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n正在关闭...');
  client.end();
  server.close();
  process.exit(0);
});

// ===== 测试页面 HTML =====
function getTestPageHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MQTT 火灾测试 - 消息发布器</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', sans-serif; background: #0f0f23; color: #fff; min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
  .container { max-width: 520px; width: 100%; }
  h1 { text-align: center; font-size: 24px; margin-bottom: 8px; color: #ff6b35; }
  .subtitle { text-align: center; color: #888; font-size: 14px; margin-bottom: 24px; }
  .card { background: #1a1a3e; border-radius: 16px; padding: 24px; margin-bottom: 16px; }
  .card-title { font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #ccc; }
  .btn { width: 100%; padding: 14px; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.1s, opacity 0.1s; margin-bottom: 12px; }
  .btn:active { transform: scale(0.98); opacity: 0.85; }
  .btn-fire { background: linear-gradient(135deg, #ff4444, #cc0000); color: #fff; }
  .btn-fire:hover { box-shadow: 0 4px 20px rgba(204,0,0,0.4); }
  .btn-normal { background: #31869B; color: #fff; }
  .btn-normal:hover { box-shadow: 0 4px 20px rgba(49,134,155,0.4); }
  .btn-custom { background: #2a2a5e; color: #fff; border: 1px solid #444; }
  .btn-stop { background: #555; color: #fff; }
  .btn-alarm { background: #ff6b35; color: #fff; }
  .status { text-align: center; font-size: 13px; color: #666; margin-top: 12px; }
  .status .connected { color: #4caf50; }
  .status .disconnected { color: #f44336; }
  .log { background: #0a0a1a; border-radius: 8px; padding: 12px; font-size: 12px; font-family: monospace; color: #8f8; max-height: 120px; overflow-y: auto; margin-top: 12px; white-space: pre-wrap; word-break: break-all; }
  label { font-size: 13px; color: #aaa; display: block; margin-bottom: 4px; }
  textarea, input { width: 100%; padding: 10px; border: 1px solid #333; border-radius: 8px; background: #0a0a1a; color: #fff; font-size: 13px; font-family: monospace; margin-bottom: 12px; }
  textarea { resize: vertical; min-height: 60px; }
  .btn-row { display: flex; gap: 8px; }
  .btn-row .btn { flex: 1; }
  hr { border: none; border-top: 1px solid #333; margin: 16px 0; }
</style>
</head>
<body>
<div class="container">
  <h1>🔥 火灾测试消息发布器</h1>
  <p class="subtitle">点击按钮发送 MQTT 消息，查看小程序如何响应</p>

  <div class="card">
    <div class="card-title">🚨 一键发送火灾消息</div>
    <button class="btn btn-fire" onclick="publish('indicator_light/data', '{"ESP32_D8:BC:38:78:24:B8":{"buzzer":2,"ESP32_fires_flag":true,"temp":28.5,"hum":45,"TVOC":0.8}}')">🔥 触发火灾报警</button>
    <button class="btn btn-normal" onclick="publish('indicator_light/data', '{"ESP32_D8:BC:38:78:24:B8":{"buzzer":1,"ESP32_fires_flag":false,"temp":26.2,"hum":43,"TVOC":0.32}}')">✅ 恢复正常状态</button>
    <button class="btn btn-alarm" onclick="publish('indicator_light/data', '{"ESP32_D8:BC:38:78:24:B8":{"buzzer":2,"ESP32_fires_flag":true,"temp":35.1,"hum":38,"TVOC":1.5,"AQI":150,"ECO2":800}}')">🌡️ 高温火灾警报</button>
  </div>

  <div class="card">
    <div class="card-title">📝 自定义消息</div>
    <label for="topic">Topic</label>
    <input id="topic" value="indicator_light/data">
    <label for="payload">Payload (JSON)</label>
    <textarea id="payload" rows="4">{"ESP32_D8:BC:38:78:24:B8":{"buzzer":2,"ESP32_fires_flag":true,"temp":28.5,"hum":45,"TVOC":0.8}}</textarea>
    <div class="btn-row">
      <button class="btn btn-custom" onclick="publishCustom()">📤 发送自定义消息</button>
      <button class="btn btn-stop" onclick="publishCustomStop()">⏹️ 发送停止火警</button>
    </div>
  </div>

  <div class="status" id="status">MQTT 状态: <span id="mqttStatus">检查中...</span></div>
  <div class="log" id="log">等待操作...</div>
</div>

<script>
  const API_BASE = '';

  // 检查连接状态
  fetch(API_BASE + '/api/status')
    .then(r => r.json())
    .then(data => {
      document.getElementById('mqttStatus').textContent = data.connected ? '✅ 已连接' : '❌ 未连接';
      document.getElementById('mqttStatus').className = data.connected ? 'connected' : 'disconnected';
    })
    .catch(() => {
      document.getElementById('mqttStatus').textContent = '❌ 无法连接服务器';
      document.getElementById('mqttStatus').className = 'disconnected';
    });

  function addLog(msg) {
    const log = document.getElementById('log');
    const time = new Date().toLocaleTimeString();
    log.textContent = '[' + time + '] ' + msg + '\\n' + log.textContent;
  }

  function publish(topic, payload) {
    addLog('发送中... ' + topic);
    fetch(API_BASE + '/api/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, payload })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        addLog('✅ 已发送: ' + topic);
      } else {
        addLog('❌ 发送失败: ' + (data.error || '未知错误'));
      }
    })
    .catch(err => {
      addLog('❌ 请求失败: ' + err.message);
    });
  }

  function publishCustom() {
    const topic = document.getElementById('topic').value;
    const payload = document.getElementById('payload').value;
    if (!topic || !payload) {
      addLog('⚠️ 请填写 topic 和 payload');
      return;
    }
    publish(topic, payload);
  }

  function publishCustomStop() {
    const topic = document.getElementById('topic').value;
    const payload = '{"ESP32_D8:BC:38:78:24:B8":{"buzzer":1,"ESP32_fires_flag":false,"temp":26.2,"hum":43,"TVOC":0.32}}';
    document.getElementById('payload').value = payload;
    publish(topic, payload);
  }
</script>
</body>
</html>`;
}
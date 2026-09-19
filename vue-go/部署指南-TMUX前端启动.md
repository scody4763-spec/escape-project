# Vue 前端 tmux 运行指南

> 服务器目录：`/home/ubuntu/escape-project/aiot/aiot-vue`
> 访问地址：http://42.193.218.29:5173

## 一、启动

```bash
tmux new -d -s frontend \
  "cd /home/ubuntu/escape-project/aiot/aiot-vue && npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/frontend.log 2>&1"
```

## 二、查看状态

```bash
tmux ls
cat /tmp/frontend.log
pgrep -af '/home/ubuntu/escape-project/aiot/aiot-vue/node_modules/.bin/vite'
```

正常日志应包含：

```text
VITE v5.4.21 ready
Local:   http://localhost:5173/
Network: http://服务器内网地址:5173/
```

## 三、进入会话查看实时输出

```bash
tmux attach -t frontend
```

退出但不终止进程：

```text
Ctrl+B，松开后按 D
```

## 四、重启

```bash
tmux kill-session -t frontend 2>/dev/null || true

tmux new -d -s frontend \
  "cd /home/ubuntu/escape-project/aiot/aiot-vue && npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/frontend.log 2>&1"
```

## 五、前后端完整启动

前端依赖后端和算法服务。服务器重启后执行：

```bash
cd /home/ubuntu/escape-project
docker compose up -d

tmux new -d -s frontend \
  "cd /home/ubuntu/escape-project/aiot/aiot-vue && npm run dev -- --host 0.0.0.0 --port 5173 > /tmp/frontend.log 2>&1"
```

`docker compose up -d` 已包含：

- `aiot-backend`
- `algorithm-service`
- EMQX
- MySQL
- Redis
- InfluxDB

## 六、命令速查

| 操作 | 命令 |
|------|------|
| 查看会话 | `tmux ls` |
| 查看日志 | `cat /tmp/frontend.log` |
| 进入会话 | `tmux attach -t frontend` |
| 退出会话 | `Ctrl+B` 后按 `D` |
| 停止前端 | `tmux kill-session -t frontend` |

## 七、限制说明

tmux 能在 SSH 断开或关闭终端后保持前端运行，但不能在服务器重启后自动恢复。生产环境建议将前端构建为静态文件并使用 Nginx 或 systemd 托管。
